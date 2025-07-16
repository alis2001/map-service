const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple user search using only map service tables
router.get('/search', async (req, res) => {
  try {
    const { lat, lng, radius = 15000, limit = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    console.log(`👥 Searching for users near ${lat}, ${lng} within ${radius}m`);

    // Search using only user_live_locations table (no joins)
    const nearbyUsers = await prisma.$queryRaw`
      SELECT 
        "userId",
        latitude,
        longitude,
        city,
        "isLive",
        "lastSeen",
        (
          6371000 * acos(
            cos(radians(${parseFloat(lat)})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${parseFloat(lng)})) + 
            sin(radians(${parseFloat(lat)})) * 
            sin(radians(latitude))
          )
        ) AS distance
      FROM user_live_locations
      WHERE "isLive" = true 
        AND "lastSeen" > NOW() - INTERVAL '30 minutes'
        AND (
          6371000 * acos(
            cos(radians(${parseFloat(lat)})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${parseFloat(lng)})) + 
            sin(radians(${parseFloat(lat)})) * 
            sin(radians(latitude))
          )
        ) <= ${parseInt(radius)}
      ORDER BY distance ASC
      LIMIT ${parseInt(limit)}
    `;

    const users = nearbyUsers.map(user => ({
      userId: user.userId,
      firstName: `User ${user.userId.slice(0, 8)}`,
      lastName: '***',
      distance: Math.round(user.distance),
      isOnline: user.isLive,
      city: user.city,
      lastSeen: user.lastSeen
    }));

    res.json({
      success: true,
      users,
      count: users.length,
      searchRadius: parseInt(radius)
    });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
