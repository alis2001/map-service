const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');

const prisma = new PrismaClient();

// Get nearby users who are live and sharing location
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;
    const userId = req.user.id; // From auth middleware
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    // Get users within radius using Haversine formula
    const nearbyUsers = await prisma.$queryRaw`
      SELECT 
        ull.*,
        cu.firstName,
        cu.lastName,
        cu.username,
        cu.profilePic,
        cu.bio,
        cup.interests,
        cup.ageRange,
        (
          6371000 * acos(
            cos(radians(${parseFloat(latitude)})) * 
            cos(radians(ull.latitude)) * 
            cos(radians(ull.longitude) - radians(${parseFloat(longitude)})) + 
            sin(radians(${parseFloat(latitude)})) * 
            sin(radians(ull.latitude))
          )
        ) AS distance
      FROM user_live_locations ull
      JOIN caffis_users cu ON ull.userId = cu.id
      LEFT JOIN caffis_user_preferences cup ON cu.id = cup.userId
      WHERE ull.isLive = true 
        AND ull.userId != ${userId}
        AND ull.shareRadius >= (
          6371000 * acos(
            cos(radians(${parseFloat(latitude)})) * 
            cos(radians(ull.latitude)) * 
            cos(radians(ull.longitude) - radians(${parseFloat(longitude)})) + 
            sin(radians(${parseFloat(latitude)})) * 
            sin(radians(ull.latitude))
          )
        )
      HAVING distance <= ${parseInt(radius)}
      ORDER BY distance ASC
      LIMIT 50
    `;

    res.json({
      success: true,
      users: nearbyUsers,
      count: nearbyUsers.length
    });

  } catch (error) {
    console.error('Error finding nearby users:', error);
    res.status(500).json({ error: 'Failed to find nearby users' });
  }
});

// Update user's live location
router.post('/location/update', async (req, res) => {
  try {
    const { latitude, longitude, isLive = true, shareRadius = 1000 } = req.body;
    const userId = req.user.id;

    const location = await prisma.userLiveLocation.upsert({
      where: { userId },
      update: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLive,
        shareRadius: parseInt(shareRadius),
        lastSeen: new Date()
      },
      create: {
        userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLive,
        shareRadius: parseInt(shareRadius)
      }
    });

    // Cache in Redis for faster access
    await redis.setex(
      `user_location:${userId}`, 
      300, // 5 minutes
      JSON.stringify(location)
    );

    res.json({ success: true, location });

  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get user profile details for card display
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Get user profile with preferences
    const userProfile = await prisma.$queryRaw`
      SELECT 
        cu.id,
        cu.firstName,
        cu.lastName,
        cu.username,
        cu.profilePic,
        cu.bio,
        cu.createdAt,
        cup.interests,
        cup.ageRange,
        cup.relationshipGoals,
        cup.activities,
        ull.lastSeen,
        ull.isLive
      FROM caffis_users cu
      LEFT JOIN caffis_user_preferences cup ON cu.id = cup.userId
      LEFT JOIN user_live_locations ull ON cu.id = ull.userId
      WHERE cu.id = ${userId}
    `;

    if (!userProfile.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if users have common interests
    const currentUser = await prisma.$queryRaw`
      SELECT cup.interests
      FROM caffis_user_preferences cup
      WHERE cup.userId = ${currentUserId}
    `;

    const profile = userProfile[0];
    
    // Calculate common interests
    let commonInterests = [];
    if (currentUser.length && profile.interests && currentUser[0].interests) {
      const userInterests = JSON.parse(currentUser[0].interests || '[]');
      const profileInterests = JSON.parse(profile.interests || '[]');
      commonInterests = userInterests.filter(interest => 
        profileInterests.includes(interest)
      );
    }

    res.json({
      success: true,
      profile: {
        ...profile,
        interests: JSON.parse(profile.interests || '[]'),
        activities: JSON.parse(profile.activities || '[]'),
        commonInterests
      }
    });

  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

module.exports = router;