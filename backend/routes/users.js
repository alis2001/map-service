const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');

const prisma = new PrismaClient();

// =============== EXISTING FUNCTIONALITY (UNCHANGED) ===============

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

// =============== NEW FUNCTIONALITY: DYNAMIC CITY-BASED DISCOVERY ===============

// Get available cities (uses existing search service)
router.get('/cities', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      // Return popular Italian cities if no query
      const popularCities = [
        { name: 'torino', displayName: 'Torino', coordinates: { lat: 45.0703, lng: 7.6869 } },
        { name: 'milano', displayName: 'Milano', coordinates: { lat: 45.4642, lng: 9.1900 } },
        { name: 'roma', displayName: 'Roma', coordinates: { lat: 41.9028, lng: 12.4964 } },
        { name: 'firenze', displayName: 'Firenze', coordinates: { lat: 43.7696, lng: 11.2558 } },
        { name: 'napoli', displayName: 'Napoli', coordinates: { lat: 40.8518, lng: 14.2681 } },
        { name: 'bologna', displayName: 'Bologna', coordinates: { lat: 44.4949, lng: 11.3426 } },
        { name: 'venezia', displayName: 'Venezia', coordinates: { lat: 45.4408, lng: 12.3155 } }
      ];

      return res.json({
        success: true,
        cities: popularCities,
        count: popularCities.length,
        type: 'popular'
      });
    }

    // Use existing search service for dynamic city search
    try {
      const searchService = require('../services/searchService');
      const cities = await searchService.searchCities(query, parseInt(limit));
      
      // Format for frontend consumption
      const formattedCities = cities.map(city => ({
        name: city.name.toLowerCase().replace(/\s+/g, ''),
        displayName: city.displayName || city.name,
        province: city.province,
        coordinates: city.coordinates,
        isCapital: city.isCapital
      }));

      res.json({
        success: true,
        cities: formattedCities,
        count: formattedCities.length,
        query,
        type: 'search'
      });
    } catch (searchError) {
      console.warn('Search service not available, using fallback');
      res.json({
        success: true,
        cities: [],
        count: 0,
        query,
        type: 'fallback',
        note: 'Search service unavailable'
      });
    }

  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Dynamic city-based user discovery (enhanced version of /nearby)
router.get('/by-city', async (req, res) => {
  try {
    const { city, lat, lng, radius = 15000, limit = 50 } = req.query;
    const userId = req.user.id;
    
    let cityCoordinates;
    let cityName;
    let searchRadius = parseInt(radius);

    // Dynamic city detection/resolution
    if (city) {
      try {
        // Try to use search service for city lookup
        const searchService = require('../services/searchService');
        const cities = await searchService.searchCities(city, 1);
        if (cities.length > 0) {
          cityCoordinates = cities[0].coordinates;
          cityName = cities[0].displayName;
          console.log(`🏙️ Found city: ${cityName} at ${cityCoordinates.lat}, ${cityCoordinates.lng}`);
        } else {
          return res.status(404).json({ error: `City "${city}" not found` });
        }
      } catch (searchError) {
        console.warn('Search service not available, using fallback cities');
        return res.status(503).json({ error: 'City search service temporarily unavailable' });
      }
    } else if (lat && lng) {
      // Use provided coordinates
      cityCoordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
      cityName = 'Current Location';
      
      // Try reverse geocoding if Google Places service is available
      try {
        const googlePlacesService = require('../services/googlePlacesService');
        if (googlePlacesService.reverseGeocode) {
          const geocodeResult = await googlePlacesService.reverseGeocode(
            cityCoordinates.lat, 
            cityCoordinates.lng
          );
          cityName = geocodeResult.city || 'Current Location';
          console.log(`📍 Reverse geocoded to: ${cityName}`);
        }
      } catch (error) {
        console.warn('⚠️ Reverse geocoding not available:', error.message);
      }
    } else {
      return res.status(400).json({ 
        error: 'Either city name or coordinates (lat, lng) required' 
      });
    }

    console.log(`🔍 Finding users near ${cityName} within ${searchRadius}m`);
    
    // Check cache first (1 minute cache for city-based searches)
    const cacheKey = `city_users:${cityCoordinates.lat.toFixed(3)}:${cityCoordinates.lng.toFixed(3)}:${Math.floor(Date.now() / 60000)}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const cachedUsers = JSON.parse(cached).filter(user => user.userId !== userId);
        console.log(`💾 Serving ${cachedUsers.length} cached users for ${cityName}`);
        return res.json({
          success: true,
          city: { name: cityName, coordinates: cityCoordinates },
          users: cachedUsers,
          count: cachedUsers.length,
          cached: true
        });
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError.message);
    }
    
    // Dynamic user discovery with location-based queries (enhanced version of existing nearby logic)
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
            cos(radians(${cityCoordinates.lat})) * 
            cos(radians(ull.latitude)) * 
            cos(radians(ull.longitude) - radians(${cityCoordinates.lng})) + 
            sin(radians(${cityCoordinates.lat})) * 
            sin(radians(ull.latitude))
          )
        ) AS distance
      FROM user_live_locations ull
      JOIN caffis_users cu ON ull.userId = cu.id
      LEFT JOIN caffis_user_preferences cup ON cu.id = cup.userId
      WHERE ull.isLive = true 
        AND ull.userId != ${userId}
        AND ull.lastSeen > NOW() - INTERVAL '30 minutes'
        AND (
          6371000 * acos(
            cos(radians(${cityCoordinates.lat})) * 
            cos(radians(ull.latitude)) * 
            cos(radians(ull.longitude) - radians(${cityCoordinates.lng})) + 
            sin(radians(${cityCoordinates.lat})) * 
            sin(radians(ull.latitude))
          )
        ) <= ${searchRadius}
      ORDER BY ull.lastSeen DESC, distance ASC
      LIMIT ${parseInt(limit)}
    `;
    
    // Process and format user data
    const formattedUsers = nearbyUsers.map(user => ({
      ...user,
      interests: user.interests ? JSON.parse(user.interests) : [],
      distance: Math.round(user.distance),
      isLive: user.isLive,
      status: getUserStatus(user.lastSeen),
      city: cityName
    }));
    
    // Cache for 1 minute
    try {
      await redis.setex(cacheKey, 60, JSON.stringify(formattedUsers));
    } catch (cacheError) {
      console.warn('Cache write failed:', cacheError.message);
    }
    
    console.log(`✅ Found ${formattedUsers.length} users near ${cityName}`);
    
    res.json({
      success: true,
      city: { name: cityName, coordinates: cityCoordinates },
      users: formattedUsers,
      count: formattedUsers.length,
      searchRadius,
      cached: false
    });
    
  } catch (error) {
    console.error('Error finding users by location:', error);
    res.status(500).json({ error: 'Failed to find users' });
  }
});

// Enhanced location update with automatic city detection
router.post('/location/update-with-city', async (req, res) => {
  try {
    const { latitude, longitude, isLive = true, shareRadius = 15000 } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    console.log(`📍 Updating location with city detection for user ${userId} at ${lat}, ${lng}`);

    // Try to detect city using Google Places API for reverse geocoding
    let detectedCity = 'unknown';
    try {
      const googlePlacesService = require('../services/googlePlacesService');
      if (googlePlacesService.reverseGeocode) {
        const geocodeResult = await googlePlacesService.reverseGeocode(lat, lng);
        if (geocodeResult.city) {
          detectedCity = geocodeResult.city.toLowerCase().replace(/\s+/g, '');
          console.log(`🏙️ Detected city: ${geocodeResult.city}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ City detection failed, using coordinates only:', error.message);
    }

    // Update location (using existing logic but with city info)
    const location = await prisma.userLiveLocation.upsert({
      where: { userId },
      update: {
        latitude: lat,
        longitude: lng,
        isLive,
        shareRadius: parseInt(shareRadius),
        lastSeen: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        latitude: lat,
        longitude: lng,
        isLive,
        shareRadius: parseInt(shareRadius)
      }
    });

    // Clear relevant caches
    try {
      const cachePattern = `city_users:*`;
      await redis.del(cachePattern);
    } catch (cacheError) {
      console.warn('Cache clear failed:', cacheError.message);
    }

    // Cache user location for faster access
    try {
      await redis.setex(
        `user_location:${userId}`, 
        300, // 5 minutes
        JSON.stringify({
          ...location,
          detectedCity
        })
      );
    } catch (cacheError) {
      console.warn('Cache write failed:', cacheError.message);
    }

    res.json({ 
      success: true, 
      location,
      detectedCity
    });

  } catch (error) {
    console.error('Error updating user location with city:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Sync user profile from main app (for profile caching)
router.post('/sync-profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      firstName, 
      lastName, 
      username, 
      bio, 
      profilePic, 
      interests, 
      ageRange,
      coffeePersonality,
      conversationTopics,
      socialGoals 
    } = req.body;
    
    console.log(`👤 Syncing profile for user ${firstName} ${lastName}`);
    
    // For now, we'll just acknowledge the sync since we don't have user_profiles table yet
    // This endpoint is ready for when the user_profiles table is added
    
    res.json({ 
      success: true, 
      message: 'Profile sync acknowledged (user_profiles table not yet implemented)',
      userId,
      data: {
        firstName,
        lastName,
        username,
        bio,
        profilePic,
        interests,
        ageRange,
        coffeePersonality,
        conversationTopics,
        socialGoals
      }
    });
    
  } catch (error) {
    console.error('Error syncing user profile:', error);
    res.status(500).json({ error: 'Failed to sync profile' });
  }
});

// =============== HELPER FUNCTIONS ===============

// Helper function to determine user status based on last seen time
function getUserStatus(lastSeen) {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const minutesAgo = Math.floor((now - lastSeenDate) / (1000 * 60));
  
  if (minutesAgo < 5) return 'online';
  if (minutesAgo < 15) return 'recent';
  if (minutesAgo < 30) return 'away';
  return 'offline';
}

module.exports = router;