// hooks/useCafes.js - UPDATED FOR INSTANT FILTERING & DARK MAP
// Location: /frontend/src/hooks/useCafes.js

import { useQuery } from 'react-query';
import { useRef, useCallback } from 'react';
import { placesAPI, apiUtils } from '../services/apiService';

// UPDATED: Ultra-fast hook with perfect type filtering for dark map
export const useCafes = (latitude, longitude, radius = 1500, type = 'cafe') => {
  const lastSearchParamsRef = useRef(null);
  const isSearchingRef = useRef(false);
  const errorCountRef = useRef(0);

  const createSearchKey = useCallback((lat, lng, rad, typ) => {
    if (!lat || !lng) return null;
    
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLng = Math.round(lng * 100) / 100;
    
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
    ['cafes', searchKey],
    async () => {
      if (!latitude || !longitude || !searchKey) {
        console.log('📍 No valid coordinates provided, skipping cafe fetch');
        return { places: [], count: 0 };
      }

      if (isSearchingRef.current) {
        console.log('🔄 Search already in progress, skipping duplicate request');
        return lastSearchParamsRef.current?.data || { places: [], count: 0 };
      }

      isSearchingRef.current = true;

      try {
        console.log('☕ Fetching venues for dark map:', {
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
          radius,
          type,
          searchKey
        });

        // UPDATED: Get ALL places in one call for instant filtering
        const result = await placesAPI.getAllNearbyPlaces(latitude, longitude, {
          radius,
          limit: 50 // Get more data for better filtering
        });

        console.log('✅ All venues fetched for dark map:', {
          totalPlaces: result.totalPlaces,
          cafes: result.cafePlaces?.length || 0,
          restaurants: result.restaurantPlaces?.length || 0
        });

        // ENHANCED: Process all places with dark map optimizations
        const enhancedCafes = (result.cafePlaces || []).map(place => {
          const formatted = apiUtils.formatPlace(place);
          
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

          // ENHANCED: Dark map specific properties
          formatted.emoji = getVenueEmoji('cafe', formatted.name);
          formatted.displayType = 'Bar/Caffetteria';
          formatted.markerColor = getCafeMarkerColor(formatted);
          formatted.markerSize = getMarkerSize(formatted.distance);
          formatted.isVeryClose = formatted.distance && formatted.distance < 200;
          formatted.walkingTime = getWalkingTime(formatted.distance);
          formatted.darkMapReady = true; // Flag for dark map compatibility
          
          if (formatted.rating) {
            formatted.ratingStars = '★'.repeat(Math.floor(formatted.rating)) + 
                                   '☆'.repeat(5 - Math.floor(formatted.rating));
            formatted.ratingText = `${formatted.rating}/5`;
          }

          return formatted;
        });

        const enhancedRestaurants = (result.restaurantPlaces || []).map(place => {
          const formatted = apiUtils.formatPlace(place);
          
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

          // ENHANCED: Dark map specific properties
          formatted.emoji = getVenueEmoji('restaurant', formatted.name);
          formatted.displayType = 'Ristorante';
          formatted.markerColor = getRestaurantMarkerColor(formatted);
          formatted.markerSize = getMarkerSize(formatted.distance);
          formatted.isVeryClose = formatted.distance && formatted.distance < 200;
          formatted.walkingTime = getWalkingTime(formatted.distance);
          formatted.darkMapReady = true; // Flag for dark map compatibility
          
          if (formatted.rating) {
            formatted.ratingStars = '★'.repeat(Math.floor(formatted.rating)) + 
                                   '☆'.repeat(5 - Math.floor(formatted.rating));
            formatted.ratingText = `${formatted.rating}/5`;
          }

          return formatted;
        });

        // SMART SORTING for dark map visibility
        [enhancedCafes, enhancedRestaurants].forEach(places => {
          places.sort((a, b) => {
            // Prioritize very close places
            if (a.isVeryClose && !b.isVeryClose) return -1;
            if (!a.isVeryClose && b.isVeryClose) return 1;
            
            // Then by rating
            if (a.isVeryClose && b.isVeryClose) {
              return (b.rating || 0) - (a.rating || 0);
            }
            
            // Finally by distance
            return (a.distance || Infinity) - (b.distance || Infinity);
          });
        });

        // RETURN: Combined data structure for instant filtering
        const combinedResult = {
          // All places combined for easy access
          places: [...enhancedCafes, ...enhancedRestaurants],
          
          // Separated by type for instant filtering
          cafePlaces: enhancedCafes,
          restaurantPlaces: enhancedRestaurants,
          
          // Counts
          count: enhancedCafes.length + enhancedRestaurants.length,
          cafeCount: enhancedCafes.length,
          restaurantCount: enhancedRestaurants.length,
          
          // User location
          userLocation: { latitude, longitude },
          
          // Dark map stats
          searchStats: {
            veryClose: [...enhancedCafes, ...enhancedRestaurants].filter(p => p.isVeryClose).length,
            walkable: [...enhancedCafes, ...enhancedRestaurants].filter(p => p.distance && p.distance < 1000).length,
            total: enhancedCafes.length + enhancedRestaurants.length,
            byType: {
              cafe: enhancedCafes.length,
              restaurant: enhancedRestaurants.length
            }
          }
        };

        lastSearchParamsRef.current = {
          params: { latitude, longitude, radius, type },
          data: combinedResult,
          timestamp: Date.now()
        };

        return combinedResult;

      } catch (error) {
        console.error('❌ Failed to fetch venues for dark map:', error);
        throw error;
      } finally {
        isSearchingRef.current = false;
      }
    },
    {
      enabled: !!(latitude && longitude && searchKey),
      staleTime: 3 * 60 * 1000,    // 3 minutes for faster updates
      cacheTime: 15 * 60 * 1000,   // 15 minutes cache
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (error?.response?.status === 429) {
          return failureCount < 1;
        }
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => {
        return Math.min(2000 * Math.pow(2, attemptIndex), 30000);
      },
      onError: (error) => {
        console.error('❌ Failed to fetch venues for dark map:', error);
        isSearchingRef.current = false;
        errorCountRef.current = Math.min((errorCountRef.current || 0) + 1, 5);
      },
      onSuccess: (data) => {
        errorCountRef.current = 0;
        console.log('✅ Dark map venue data processed:', {
          totalPlaces: data.count,
          cafes: data.cafeCount,
          restaurants: data.restaurantCount,
          veryClose: data.searchStats?.veryClose || 0
        });
      }
    }
  );

  // DARK MAP: Venue emoji mapping with bright colors
  const getVenueEmoji = (type, name) => {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    if (nameLower.includes('caffè') || nameLower.includes('caffe')) return '☕';
    
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  };

  // DARK MAP: Bright marker colors for cafes
  const getCafeMarkerColor = (place) => {
    if (place.distance && place.distance < 200) return '#FFD700'; // Gold for very close
    if (place.rating && place.rating >= 4.5) return '#FF6B6B';     // Bright red for high rated
    if (place.distance && place.distance < 500) return '#4ECDC4';  // Bright teal for close
    return '#FF9F43'; // Bright orange default
  };

  // DARK MAP: Bright marker colors for restaurants  
  const getRestaurantMarkerColor = (place) => {
    if (place.distance && place.distance < 200) return '#FFD700'; // Gold for very close
    if (place.rating && place.rating >= 4.5) return '#A55EEA';     // Bright purple for high rated
    if (place.distance && place.distance < 500) return '#26DE81'; // Bright green for close
    return '#FD79A8'; // Bright pink default
  };

  // DARK MAP: Dynamic marker sizes
  const getMarkerSize = (distance) => {
    if (!distance) return 28;
    if (distance < 200) return 32; // Larger for very close
    if (distance < 500) return 30; // Medium for close
    return 28; // Standard size
  };

  // Calculate walking time
  const getWalkingTime = (distance) => {
    if (!distance) return null;
    
    const walkingSpeedKmh = 5;
    const timeMinutes = Math.round((distance / 1000) * (60 / walkingSpeedKmh));
    
    if (timeMinutes < 1) return 'Sotto 1 min';
    if (timeMinutes < 60) return `${timeMinutes} min a piedi`;
    
    const hours = Math.floor(timeMinutes / 60);
    const mins = timeMinutes % 60;
    return `${hours}h ${mins}m a piedi`;
  };

  // EXTRACT DATA based on requested type for instant filtering
  const getFilteredPlaces = () => {
    if (!data) return [];
    
    switch (type) {
      case 'cafe':
        return data.cafePlaces || [];
      case 'restaurant':
        return data.restaurantPlaces || [];
      default:
        return data.places || [];
    }
  };

  const filteredPlaces = getFilteredPlaces();
  const filteredCount = filteredPlaces.length;

  // Helper functions for dark map
  const getVenuesByType = (venueType) => {
    if (!data) return [];
    
    switch (venueType) {
      case 'cafe':
        return data.cafePlaces || [];
      case 'restaurant':
        return data.restaurantPlaces || [];
      default:
        return [];
    }
  };

  const getVenuesWithinWalkingDistance = (maxMinutes = 10) => {
    const maxDistance = (maxMinutes / 60) * 5 * 1000;
    return filteredPlaces.filter(place => place.distance && place.distance <= maxDistance);
  };

  const getTopRatedVenues = (minRating = 4.0, maxCount = 10) => {
    return filteredPlaces
      .filter(place => place.rating && place.rating >= minRating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, maxCount);
  };

  const getDarkMapStats = () => {
    if (!data) return { total: 0, byType: { cafe: 0, restaurant: 0 } };
    
    return {
      total: data.count || 0,
      byType: {
        cafe: data.cafeCount || 0,
        restaurant: data.restaurantCount || 0
      },
      veryClose: data.searchStats?.veryClose || 0,
      walkable: data.searchStats?.walkable || 0,
      currentFilter: type,
      filteredCount: filteredCount
    };
  };

  return {
    // MAIN DATA - Filtered by type for instant display
    cafes: filteredPlaces,
    count: filteredCount,
    userLocation: data?.userLocation || null,
    searchStats: data?.searchStats || { veryClose: 0, walkable: 0, total: 0 },
    loading,
    error,
    refetch,
    isFetching,
    
    // RAW DATA - All venues for instant switching
    allData: data,
    allPlaces: data?.places || [],
    
    // HELPER FUNCTIONS
    getVenuesByType,
    getVenuesWithinWalkingDistance,
    getTopRatedVenues,
    getDarkMapStats,
    
    // COMPUTED VALUES
    hasData: filteredCount > 0,
    isEmpty: !loading && filteredCount === 0,
    isRefreshing: isFetching && !loading,
    
    // TYPE-SPECIFIC HELPERS for instant switching
    getCafes: () => getVenuesByType('cafe'),
    getRestaurants: () => getVenuesByType('restaurant'),
    getVeryCloseVenues: () => filteredPlaces.filter(p => p.isVeryClose),
    getWalkableVenues: () => getVenuesWithinWalkingDistance(15),
    
    // PERFORMANCE INDICATORS
    performance: {
      lastSearchTime: lastSearchParamsRef.current?.timestamp,
      cacheHit: !loading && !!data,
      searchInProgress: isSearchingRef.current,
      dataComplete: !!(data?.cafePlaces && data?.restaurantPlaces)
    }
  };
};

// UPDATED: Text search hook with dark map support
export const usePlaceSearch = (query, userLocation = null) => {
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

      console.log('🔍 Searching places for dark map:', { query, userLocation });

      try {
        const result = await placesAPI.searchPlaces(query.trim(), {
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
          limit: 15
        });

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

          // DARK MAP: Enhanced formatting
          formatted.emoji = formatted.type === 'restaurant' ? '🍽️' : '☕';
          formatted.displayType = formatted.type === 'restaurant' ? 'Ristorante' : 'Bar/Caffetteria';
          formatted.darkMapReady = true;
          
          if (formatted.rating) {
            formatted.ratingStars = '★'.repeat(Math.floor(formatted.rating)) + 
                                   '☆'.repeat(5 - Math.floor(formatted.rating));
          }

          return formatted;
        });

        enhancedPlaces.sort((a, b) => {
          const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
          const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
          
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          
          return (a.distance || Infinity) - (b.distance || Infinity);
        });

        return {
          places: enhancedPlaces,
          count: enhancedPlaces.length
        };
      } catch (error) {
        console.error('❌ Search failed for dark map:', error);
        throw error;
      }
    },
    {
      enabled: !!(query && query.trim().length >= 2),
      staleTime: 3 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
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

// UPDATED: Hook for place details with dark map enhancements
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

      console.log('📍 Fetching place details for dark map:', placeId);

      const result = await placesAPI.getPlaceDetails(placeId, userLocation);
      
      if (!result.success || !result.place) {
        throw new Error('Venue not found');
      }

      const formatted = apiUtils.formatPlace(result.place);
      
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

      // DARK MAP: Enhanced formatting
      formatted.emoji = formatted.type === 'restaurant' ? '🍽️' : '☕';
      formatted.displayType = formatted.type === 'restaurant' ? 'Ristorante' : 'Bar/Caffetteria';
      formatted.darkMapReady = true;
      
      if (formatted.rating) {
        formatted.ratingStars = '★'.repeat(Math.floor(formatted.rating)) + 
                               '☆'.repeat(5 - Math.floor(formatted.rating));
      }

      return formatted;
    },
    {
      enabled: !!placeId,
      staleTime: 10 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
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