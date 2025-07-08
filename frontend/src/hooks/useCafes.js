// hooks/useCafes.js
// Location: /map-service/frontend/src/hooks/useCafes.js

import { useQuery } from 'react-query';
import { placesAPI, apiUtils } from '../services/apiService';

export const useCafes = (latitude, longitude, radius = 1500, type = 'cafe') => {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['cafes', latitude, longitude, radius, type],
    async () => {
      if (!latitude || !longitude) {
        console.log('📍 No coordinates provided, skipping cafe fetch');
        return { places: [], count: 0 };
      }

      console.log('☕ Fetching cafes:', {
        latitude,
        longitude,
        radius,
        type
      });

      const result = await placesAPI.getNearbyPlaces(latitude, longitude, {
        radius,
        type,
        limit: 50 // Get more places for better map coverage
      });

      console.log('✅ Cafes fetched successfully:', {
        count: result.count,
        places: result.places?.length || 0
      });

      // Process and enhance the places data
      const enhancedPlaces = result.places.map(place => {
        const formatted = apiUtils.formatPlace(place);
        
        // Calculate distance if user location is available
        if (latitude && longitude && formatted.location) {
          const distance = apiUtils.calculateDistance(
            latitude,
            longitude,
            formatted.location.latitude,
            formatted.location.longitude
          );
          formatted.distance = Math.round(distance);
          formatted.formattedDistance = apiUtils.formatDistance(distance);
        }

        // Add type emoji
        formatted.emoji = apiUtils.getTypeEmoji(formatted.type);
        
        // Add rating stars
        if (formatted.rating) {
          formatted.ratingStars = apiUtils.getRatingStars(formatted.rating);
        }

        return formatted;
      });

      // Sort by distance (closest first)
      enhancedPlaces.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      return {
        places: enhancedPlaces,
        count: enhancedPlaces.length,
        userLocation: { latitude, longitude }
      };
    },
    {
      enabled: !!(latitude && longitude), // Only run if coordinates exist
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx), only on server errors (5xx)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error) => {
        console.error('❌ Failed to fetch cafes:', error);
      },
      onSuccess: (data) => {
        console.log('✅ Cafes data processed:', {
          totalPlaces: data.count,
          nearbyPlaces: data.places.filter(p => p.distance && p.distance < 1000).length
        });
      }
    }
  );

  // Extract places and count from data
  const cafes = data?.places || [];
  const count = data?.count || 0;
  const userLocation = data?.userLocation || null;

  // Helper functions
  const getPlacesByType = (placeType) => {
    return cafes.filter(place => place.type === placeType);
  };

  const getPlacesWithinRadius = (radiusMeters) => {
    return cafes.filter(place => place.distance && place.distance <= radiusMeters);
  };

  const getTopRatedPlaces = (minRating = 4.0, maxCount = 10) => {
    return cafes
      .filter(place => place.rating && place.rating >= minRating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, maxCount);
  };

  const searchPlaces = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return cafes.filter(place => 
      place.name.toLowerCase().includes(term) ||
      place.address.toLowerCase().includes(term)
    );
  };

  const getPlaceById = (placeId) => {
    return cafes.find(place => 
      place.id === placeId || place.googlePlaceId === placeId
    );
  };

  // Statistics
  const getStatistics = () => {
    const stats = {
      total: count,
      byType: {},
      byDistance: {
        veryClose: 0,  // < 500m
        close: 0,      // 500m - 1km
        moderate: 0,   // 1km - 2km
        far: 0         // > 2km
      },
      avgRating: 0,
      topRated: getTopRatedPlaces(4.5, 5)
    };

    // Count by type
    cafes.forEach(place => {
      const type = place.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by distance
      if (place.distance) {
        if (place.distance < 500) stats.byDistance.veryClose++;
        else if (place.distance < 1000) stats.byDistance.close++;
        else if (place.distance < 2000) stats.byDistance.moderate++;
        else stats.byDistance.far++;
      }
    });

    // Calculate average rating
    const ratedPlaces = cafes.filter(place => place.rating);
    if (ratedPlaces.length > 0) {
      stats.avgRating = ratedPlaces.reduce((sum, place) => sum + place.rating, 0) / ratedPlaces.length;
      stats.avgRating = Math.round(stats.avgRating * 10) / 10; // Round to 1 decimal
    }

    return stats;
  };

  return {
    cafes,
    count,
    userLocation,
    loading,
    error,
    refetch,
    isFetching,
    
    // Helper functions
    getPlacesByType,
    getPlacesWithinRadius,
    getTopRatedPlaces,
    searchPlaces,
    getPlaceById,
    getStatistics,
    
    // Computed values
    hasData: count > 0,
    isEmpty: !loading && count === 0,
    isRefreshing: isFetching && !loading
  };
};

// Hook for searching places by text
export const usePlaceSearch = (query, userLocation = null) => {
  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery(
    ['placeSearch', query, userLocation?.latitude, userLocation?.longitude],
    async () => {
      if (!query || query.trim().length < 2) {
        return { places: [], count: 0 };
      }

      console.log('🔍 Searching places:', { query, userLocation });

      const result = await placesAPI.searchPlaces(query.trim(), {
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        limit: 20
      });

      // Process places similar to useCafes
      const enhancedPlaces = result.places.map(place => {
        const formatted = apiUtils.formatPlace(place);
        
        if (userLocation && formatted.location) {
          const distance = apiUtils.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            formatted.location.latitude,
            formatted.location.longitude
          );
          formatted.distance = Math.round(distance);
          formatted.formattedDistance = apiUtils.formatDistance(distance);
        }

        formatted.emoji = apiUtils.getTypeEmoji(formatted.type);
        if (formatted.rating) {
          formatted.ratingStars = apiUtils.getRatingStars(formatted.rating);
        }

        return formatted;
      });

      // Sort by relevance and distance
      enhancedPlaces.sort((a, b) => {
        // First by name match (exact matches first)
        const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
        const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Then by distance
        return (a.distance || Infinity) - (b.distance || Infinity);
      });

      return {
        places: enhancedPlaces,
        count: enhancedPlaces.length
      };
    },
    {
      enabled: !!(query && query.trim().length >= 2),
      staleTime: 2 * 60 * 1000, // 2 minutes for search results
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1 // Less retries for search
    }
  );

  return {
    places: data?.places || [],
    count: data?.count || 0,
    loading,
    error,
    refetch,
    hasResults: !loading && (data?.count || 0) > 0,
    noResults: !loading && query && query.trim().length >= 2 && (data?.count || 0) === 0
  };
};

// Hook for getting place details
export const usePlaceDetails = (placeId, userLocation = null) => {
  const {
    data: place,
    isLoading: loading,
    error,
    refetch
  } = useQuery(
    ['placeDetails', placeId],
    async () => {
      if (!placeId) return null;

      console.log('📍 Fetching place details:', placeId);

      const result = await placesAPI.getPlaceDetails(placeId, userLocation);
      
      if (!result.success || !result.place) {
        throw new Error('Place not found');
      }

      const formatted = apiUtils.formatPlace(result.place);
      
      // Add distance if user location available
      if (userLocation && formatted.location) {
        const distance = apiUtils.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          formatted.location.latitude,
          formatted.location.longitude
        );
        formatted.distance = Math.round(distance);
        formatted.formattedDistance = apiUtils.formatDistance(distance);
      }

      formatted.emoji = apiUtils.getTypeEmoji(formatted.type);
      if (formatted.rating) {
        formatted.ratingStars = apiUtils.getRatingStars(formatted.rating);
      }

      return formatted;
    },
    {
      enabled: !!placeId,
      staleTime: 10 * 60 * 1000, // 10 minutes for detailed data
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 2
    }
  );

  return {
    place,
    loading,
    error,
    refetch,
    hasPlace: !!place
  };
};