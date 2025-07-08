// hooks/useCafes.js - FIXED VERSION with Debouncing
// Location: /map-service/frontend/src/hooks/useCafes.js

import { useQuery } from 'react-query';
import { useRef, useCallback } from 'react';
import { placesAPI, apiUtils } from '../services/apiService';

// FIXED: Custom hook with debouncing to prevent excessive API calls
export const useCafes = (latitude, longitude, radius = 1500, type = 'cafe') => {
  // Refs for debouncing
  const debounceTimeoutRef = useRef(null);
  const lastSearchParamsRef = useRef(null);

  // Create stable search key with rounded coordinates to prevent excessive calls
  const createSearchKey = useCallback((lat, lng, rad, typ) => {
    if (!lat || !lng) return null;
    
    // Round coordinates to 3 decimal places (~100m accuracy) to reduce unnecessary API calls
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    
    return `${roundedLat}-${roundedLng}-${rad}-${typ}`;
  }, []);

  const searchKey = createSearchKey(latitude, longitude, radius, type);

  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['cafes', searchKey], // Use stable search key
    async () => {
      if (!latitude || !longitude || !searchKey) {
        console.log('📍 No valid coordinates provided, skipping cafe fetch');
        return { places: [], count: 0 };
      }

      console.log('☕ Fetching cafes:', {
        latitude,
        longitude,
        radius,
        type,
        searchKey
      });

      // FIXED: Debounced API call to prevent rate limiting
      return new Promise((resolve, reject) => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Set new timeout for debouncing
        debounceTimeoutRef.current = setTimeout(async () => {
          try {
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

              // FIXED: Add proper type mapping for Italian venues
              formatted.emoji = getItalianVenueEmoji(formatted.type, formatted.name);
              formatted.displayType = getItalianVenueDisplayType(formatted.type);
              
              // Add rating stars
              if (formatted.rating) {
                formatted.ratingStars = apiUtils.getRatingStars(formatted.rating);
              }

              return formatted;
            });

            // Sort by distance (closest first)
            enhancedPlaces.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

            resolve({
              places: enhancedPlaces,
              count: enhancedPlaces.length,
              userLocation: { latitude, longitude }
            });

          } catch (error) {
            console.error('❌ Failed to fetch cafes:', error);
            reject(error);
          }
        }, 800); // Wait 800ms before making API call
      });
    },
    {
      enabled: !!(latitude && longitude && searchKey), // Only run if coordinates exist
      staleTime: 10 * 60 * 1000, // 10 minutes - longer for reduced API calls
      cacheTime: 20 * 60 * 1000, // 20 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount if we have cached data
      retry: (failureCount, error) => {
        // Don't retry on rate limiting (429) or client errors (4xx)
        if (error?.response?.status === 429) {
          console.log('🛑 Rate limited, not retrying');
          return false;
        }
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2; // Reduced retries
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      onError: (error) => {
        console.error('❌ Failed to fetch cafes:', error);
        // Clear timeout on error
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      },
      onSuccess: (data) => {
        console.log('✅ Cafes data processed:', {
          totalPlaces: data.count,
          nearbyPlaces: data.places.filter(p => p.distance && p.distance < 1000).length
        });
        
        // Update last search params
        lastSearchParamsRef.current = { latitude, longitude, radius, type };
      }
    }
  );

  // FIXED: Helper function for Italian venue emojis
  const getItalianVenueEmoji = (type, name) => {
    // Check name for specific venue types
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('pub') || nameLower.includes('birreria')) {
      return '🍺';
    }
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) {
      return '🍕';
    }
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) {
      return '🍦';
    }
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) {
      return '🧁';
    }
    
    // Default based on type
    switch (type) {
      case 'pub': return '🍺';
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  };

  // FIXED: Helper function for Italian venue display types
  const getItalianVenueDisplayType = (type) => {
    switch (type) {
      case 'cafe': return 'Caffetteria/Bar';
      case 'pub': return 'Pub';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  };

  // Extract places and count from data
  const cafes = data?.places || [];
  const count = data?.count || 0;
  const userLocation = data?.userLocation || null;

  // FIXED: Helper functions with Italian venue support
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
      place.address.toLowerCase().includes(term) ||
      place.displayType?.toLowerCase().includes(term)
    );
  };

  const getPlaceById = (placeId) => {
    return cafes.find(place => 
      place.id === placeId || place.googlePlaceId === placeId
    );
  };

  // FIXED: Statistics with Italian venue categorization
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
      topRated: getTopRatedPlaces(4.5, 5),
      italian: {
        caffeterias: 0, // Bars/cafes
        pubs: 0,        // Pubs/nightlife
        restaurants: 0  // Restaurants
      }
    };

    // Count by type and distance
    cafes.forEach(place => {
      const type = place.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Italian venue categorization
      if (type === 'cafe') stats.italian.caffeterias++;
      else if (type === 'pub') stats.italian.pubs++;
      else if (type === 'restaurant') stats.italian.restaurants++;

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

  // FIXED: Cleanup function to clear timeouts
  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  return {
    cafes,
    count,
    userLocation,
    loading,
    error,
    refetch,
    isFetching,
    cleanup,
    
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
    isRefreshing: isFetching && !loading,
    
    // Italian venue specific helpers
    getCaffeterias: () => getPlacesByType('cafe'),
    getPubs: () => getPlacesByType('pub'),
    getRestaurants: () => getPlacesByType('restaurant')
  };
};

// FIXED: Hook for searching places by text with debouncing
export const usePlaceSearch = (query, userLocation = null) => {
  const debounceTimeoutRef = useRef(null);

  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery(
    ['placeSearch', query?.trim(), userLocation?.latitude, userLocation?.longitude],
    async () => {
      if (!query || query.trim().length < 2) {
        return { places: [], count: 0 };
      }

      console.log('🔍 Searching places:', { query, userLocation });

      // FIXED: Debounced search to prevent excessive API calls
      return new Promise((resolve, reject) => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(async () => {
          try {
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

            resolve({
              places: enhancedPlaces,
              count: enhancedPlaces.length
            });
          } catch (error) {
            reject(error);
          }
        }, 600); // Wait 600ms before searching
      });
    },
    {
      enabled: !!(query && query.trim().length >= 2),
      staleTime: 5 * 60 * 1000, // 5 minutes for search results
      cacheTime: 10 * 60 * 1000, // 10 minutes
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

// FIXED: Hook for getting place details with caching
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
      staleTime: 15 * 60 * 1000, // 15 minutes for detailed data
      cacheTime: 60 * 60 * 1000, // 60 minutes
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