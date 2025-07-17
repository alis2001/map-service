const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');

const prisma = new PrismaClient();

// =============== EXISTING FUNCTIONALITY (ENHANCED) ===============

// Get nearby users who are live and sharing location
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;
    const userId = req.user.id; // From auth middleware
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    // Get users within radius using Haversine formula - FIXED TO USE user_profiles
    const nearbyUsers = await prisma.$queryRaw`
      SELECT 
        ull.*,
        up.firstName,
        up.lastName,
        up.username,
        up.profilePic,
        up.bio,
        up.interests,
        up.ageRange,
        up.coffeePersonality,
        up.conversationTopics,
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
      JOIN user_profiles up ON ull.userId = up.userId
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

    // Format user data with enhanced status
    const formattedUsers = nearbyUsers.map(user => ({
      ...user,
      interests: user.interests ? JSON.parse(user.interests) : [],
      conversationTopics: user.conversationTopics ? JSON.parse(user.conversationTopics) : [],
      distance: Math.round(user.distance),
      status: getUserStatus(user.lastSeen),
      isLive: user.isLive
    }));

    res.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length,
      searchRadius: parseInt(radius),
      timestamp: new Date().toISOString()
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

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const location = await prisma.userLiveLocation.upsert({
      where: { userId },
      update: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLive,
        shareRadius: parseInt(shareRadius),
        lastSeen: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLive,
        shareRadius: parseInt(shareRadius),
        city: 'unknown' // Will be updated by city detection
      }
    });

    // Cache in Redis for faster access
    try {
      await redis.setex(
        `user_location:${userId}`, 
        300, // 5 minutes
        JSON.stringify(location)
      );
    } catch (cacheError) {
      console.warn('Cache write failed:', cacheError.message);
    }

    res.json({ success: true, location });

  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get user profile details for card display - FIXED TO USE user_profiles
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Get user profile - FIXED TO USE user_profiles table
    const userProfile = await prisma.$queryRaw`
      SELECT 
        up.userId as id,
        up.firstName,
        up.lastName,
        up.username,
        up.profilePic,
        up.bio,
        up.createdAt,
        up.interests,
        up.ageRange,
        up.coffeePersonality,
        up.conversationTopics,
        up.socialGoals,
        ull.lastSeen,
        ull.isLive,
        ull.city
      FROM user_profiles up
      LEFT JOIN user_live_locations ull ON up.userId = ull.userId
      WHERE up.userId = ${userId}
    `;

    if (!userProfile.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if users have common interests - FIXED TO USE user_profiles
    const currentUser = await prisma.$queryRaw`
      SELECT up.interests
      FROM user_profiles up
      WHERE up.userId = ${currentUserId}
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
        conversationTopics: JSON.parse(profile.conversationTopics || '[]'),
        commonInterests,
        status: getUserStatus(profile.lastSeen),
        isOnline: profile.isLive && getUserStatus(profile.lastSeen) !== 'offline'
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
        { name: 'torino', displayName: 'Torino', coordinates: { lat: 45.0703, lng: 7.6869 }, userCount: await getCityUserCount(45.0703, 7.6869) },
        { name: 'milano', displayName: 'Milano', coordinates: { lat: 45.4642, lng: 9.1900 }, userCount: await getCityUserCount(45.4642, 9.1900) },
        { name: 'roma', displayName: 'Roma', coordinates: { lat: 41.9028, lng: 12.4964 }, userCount: await getCityUserCount(41.9028, 12.4964) },
        { name: 'firenze', displayName: 'Firenze', coordinates: { lat: 43.7696, lng: 11.2558 }, userCount: await getCityUserCount(43.7696, 11.2558) },
        { name: 'napoli', displayName: 'Napoli', coordinates: { lat: 40.8518, lng: 14.2681 }, userCount: await getCityUserCount(40.8518, 14.2681) },
        { name: 'bologna', displayName: 'Bologna', coordinates: { lat: 44.4949, lng: 11.3426 }, userCount: await getCityUserCount(44.4949, 11.3426) },
        { name: 'venezia', displayName: 'Venezia', coordinates: { lat: 45.4408, lng: 12.3155 }, userCount: await getCityUserCount(45.4408, 12.3155) }
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
      
      // Format for frontend consumption with user counts
      const formattedCities = await Promise.all(cities.map(async city => ({
        name: city.name.toLowerCase().replace(/\s+/g, ''),
        displayName: city.displayName || city.name,
        province: city.province,
        coordinates: city.coordinates,
        isCapital: city.isCapital,
        userCount: await getCityUserCount(city.coordinates.lat, city.coordinates.lng)
      })));

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

// Dynamic city-based user discovery - FIXED TO USE user_profiles
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
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError.message);
    }
    
    // Dynamic user discovery - FIXED TO USE user_profiles table
    const nearbyUsers = await prisma.$queryRaw`
      SELECT 
        ull.*,
        up.firstName,
        up.lastName,
        up.username,
        up.profilePic,
        up.bio,
        up.interests,
        up.ageRange,
        up.coffeePersonality,
        up.conversationTopics,
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
      JOIN user_profiles up ON ull.userId = up.userId
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
    
    // Process and format user data with enhanced information
    const formattedUsers = nearbyUsers.map(user => ({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      profilePic: user.profilePic,
      bio: user.bio,
      interests: user.interests ? JSON.parse(user.interests) : [],
      ageRange: user.ageRange,
      coffeePersonality: user.coffeePersonality,
      conversationTopics: user.conversationTopics ? JSON.parse(user.conversationTopics) : [],
      distance: Math.round(user.distance),
      isLive: user.isLive,
      lastSeen: user.lastSeen,
      status: getUserStatus(user.lastSeen),
      city: cityName,
      shareRadius: user.shareRadius,
      // Enhanced status info
      isOnline: user.isLive && getUserStatus(user.lastSeen) === 'online',
      minutesAgo: Math.floor((new Date() - new Date(user.lastSeen)) / (1000 * 60))
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
      cached: false,
      timestamp: new Date().toISOString()
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
    let cityDisplayName = 'Unknown Location';
    
    try {
      const googlePlacesService = require('../services/googlePlacesService');
      if (googlePlacesService.reverseGeocode) {
        const geocodeResult = await googlePlacesService.reverseGeocode(lat, lng);
        if (geocodeResult.city) {
          detectedCity = geocodeResult.city.toLowerCase().replace(/\s+/g, '');
          cityDisplayName = geocodeResult.city;
          console.log(`🏙️ Detected city: ${geocodeResult.city}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ City detection failed, using coordinates only:', error.message);
    }

    // Update location with city information
    const location = await prisma.userLiveLocation.upsert({
      where: { userId },
      update: {
        latitude: lat,
        longitude: lng,
        city: detectedCity,
        isLive,
        shareRadius: parseInt(shareRadius),
        lastSeen: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        latitude: lat,
        longitude: lng,
        city: detectedCity,
        isLive,
        shareRadius: parseInt(shareRadius)
      }
    });

    // Clear relevant caches to ensure fresh data
    try {
      const cacheKeys = await redis.keys('city_users:*');
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
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
          detectedCity,
          cityDisplayName
        })
      );
    } catch (cacheError) {
      console.warn('Cache write failed:', cacheError.message);
    }

    res.json({ 
      success: true, 
      location: {
        ...location,
        cityDisplayName
      },
      detectedCity,
      cityDisplayName,
      message: `Location updated in ${cityDisplayName}`
    });

  } catch (error) {
    console.error('Error updating user location with city:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ENHANCED: Sync user profile from main app - Include all preferences
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
      socialGoals,
      // NEW: Additional preferences
      socialEnergy,
      groupPreference,
      locationPreference,
      meetingFrequency,
      timePreference,
      createdAt,
      onboardingCompleted
    } = req.body;
    
    console.log(`👤 Syncing enhanced profile for user ${firstName} ${lastName}`);
    
    // Sync to user_profiles table with all preferences
    try {
      await prisma.userProfile.upsert({
        where: { userId },
        update: {
          firstName: firstName || '',
          lastName: lastName || '',
          username,
          bio,
          profilePic,
          interests: interests ? JSON.stringify(interests) : null,
          ageRange,
          coffeePersonality,
          conversationTopics: conversationTopics ? JSON.stringify(conversationTopics) : null,
          socialGoals,
          // NEW: Store additional preferences
          socialEnergy,
          groupPreference,
          locationPreference,
          meetingFrequency,
          timePreference,
          registeredAt: createdAt ? new Date(createdAt) : null,
          onboardingCompleted: onboardingCompleted || false,
          lastUpdated: new Date()
        },
        create: {
          userId,
          firstName: firstName || '',
          lastName: lastName || '',
          username,
          bio,
          profilePic,
          interests: interests ? JSON.stringify(interests) : null,
          ageRange,
          coffeePersonality,
          conversationTopics: conversationTopics ? JSON.stringify(conversationTopics) : null,
          socialGoals,
          // NEW: Store additional preferences on create
          socialEnergy,
          groupPreference,
          locationPreference,
          meetingFrequency,
          timePreference,
          registeredAt: createdAt ? new Date(createdAt) : new Date(),
          onboardingCompleted: onboardingCompleted || false
        }
      });
      
      console.log(`✅ Enhanced profile synced successfully for ${firstName} ${lastName}`);
      
      res.json({ 
        success: true, 
        message: 'Enhanced profile synced successfully',
        userId,
        profileData: {
          firstName,
          lastName,
          username,
          bio,
          profilePic,
          interests,
          ageRange,
          coffeePersonality,
          conversationTopics,
          socialGoals,
          socialEnergy,
          groupPreference,
          locationPreference,
          meetingFrequency,
          timePreference,
          registeredAt: createdAt,
          onboardingCompleted
        }
      });
      
    } catch (tableError) {
      console.warn('Enhanced sync failed:', tableError.message);
      
      res.json({ 
        success: true, 
        message: 'Profile sync acknowledged (enhanced fields not yet implemented)',
        userId,
        data: { firstName, lastName, username, bio }
      });
    }
    
  } catch (error) {
    console.error('Error syncing enhanced user profile:', error);
    res.status(500).json({ error: 'Failed to sync enhanced profile' });
  }
});

// =============== NEW ENDPOINTS FOR ENHANCED FUNCTIONALITY ===============

// Get user discovery stats for dashboard
router.get('/discovery/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current location for city stats
    const userLocation = await prisma.userLiveLocation.findUnique({
      where: { userId }
    });
    
    let cityStats = null;
    if (userLocation) {
      const nearbyCount = await prisma.$queryRaw`
        SELECT COUNT(*) as nearby_users
        FROM user_live_locations ull
        WHERE ull.isLive = true 
          AND ull.userId != ${userId}
          AND ull.lastSeen > NOW() - INTERVAL '30 minutes'
          AND (
            6371000 * acos(
              cos(radians(${userLocation.latitude})) * 
              cos(radians(ull.latitude)) * 
              cos(radians(ull.longitude) - radians(${userLocation.longitude})) + 
              sin(radians(${userLocation.latitude})) * 
              sin(radians(ull.latitude))
            )
          ) <= 15000
      `;
      
      cityStats = {
        currentCity: userLocation.city,
        nearbyUsers: parseInt(nearbyCount[0].nearby_users),
        lastUpdated: userLocation.updatedAt
      };
    }
    
    // Get overall platform stats
    const platformStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_active_users,
        COUNT(CASE WHEN lastSeen > NOW() - INTERVAL '5 minutes' THEN 1 END) as online_now,
        COUNT(CASE WHEN lastSeen > NOW() - INTERVAL '15 minutes' THEN 1 END) as active_recently,
        COUNT(DISTINCT city) as active_cities
      FROM user_live_locations
      WHERE isLive = true
    `;
    
    res.json({
      success: true,
      stats: {
        platform: platformStats[0],
        city: cityStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting discovery stats:', error);
    res.status(500).json({ error: 'Failed to get discovery stats' });
  }
});

// Get active cities with user counts
router.get('/cities/active', async (req, res) => {
  try {
    const activeCities = await prisma.$queryRaw`
      SELECT 
        city,
        COUNT(*) as user_count,
        COUNT(CASE WHEN lastSeen > NOW() - INTERVAL '5 minutes' THEN 1 END) as online_now,
        MAX(lastSeen) as last_activity
      FROM user_live_locations
      WHERE isLive = true 
        AND city != 'unknown'
        AND lastSeen > NOW() - INTERVAL '2 hours'
      GROUP BY city
      HAVING COUNT(*) > 0
      ORDER BY user_count DESC, last_activity DESC
      LIMIT 20
    `;
    
    res.json({
      success: true,
      cities: activeCities.map(city => ({
        name: city.city,
        displayName: city.city.charAt(0).toUpperCase() + city.city.slice(1),
        userCount: parseInt(city.user_count),
        onlineNow: parseInt(city.online_now),
        lastActivity: city.last_activity
      })),
      count: activeCities.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting active cities:', error);
    res.status(500).json({ error: 'Failed to get active cities' });
  }
});

// Get current user profile (REQUIRED by frontend)
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    res.json({
      success: true,
      user: {
        id: userId,
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || ''
      }
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// =============== HELPER FUNCTIONS ===============

// Helper function to determine user status based on last seen time
function getUserStatus(lastSeen) {
  if (!lastSeen) return 'offline';
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const minutesAgo = Math.floor((now - lastSeenDate) / (1000 * 60));
  
  if (minutesAgo < 5) return 'online';
  if (minutesAgo < 15) return 'recent';
  if (minutesAgo < 30) return 'away';
  return 'offline';
}

// Helper function to get user count for a city
async function getCityUserCount(lat, lng, radius = 15000) {
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as user_count
      FROM user_live_locations ull
      WHERE ull.isLive = true 
        AND ull.lastSeen > NOW() - INTERVAL '30 minutes'
        AND (
          6371000 * acos(
            cos(radians(${lat})) * 
            cos(radians(ull.latitude)) * 
            cos(radians(ull.longitude) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(ull.latitude))
          )
        ) <= ${radius}
    `;
    
    return parseInt(result[0].user_count) || 0;
  } catch (error) {
    console.warn('Error getting city user count:', error.message);
    return 0;
  }
}

module.exports = router;