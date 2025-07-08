// hooks/useCafes.js - COMPLETE UPDATED VERSION - Removed Pubs Support
// Location: /frontend/src/hooks/useCafes.js

import { useQuery } from 'react-query';
import { useRef, useCallback } from 'react';
import { placesAPI, apiUtils } from '../services/apiService';

// UPDATED: Smart hook with reduced API calls and better Italian venue support (no pubs)
export const useCafes = (latitude, longitude, radius = 1500, type = 'cafe') => {
  const lastSearchParamsRef = useRef(null);
  const isSearchingRef = useRef(false);

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
        console.log('☕ Fetching Italian venues:', {
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
          radius,
          type,
          searchKey
        });

        const result = await placesAPI.getNearbyPlaces(latitude, longitude, {
          radius,
          type,
          limit: 25
        });

        console.log('✅ Italian venues fetched successfully:', {
          count: result.count,
          places: result.places?.length || 0
        });

        const enhancedPlaces = result.places.map(place => {
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

          // UPDATED: Italian venue specific properties (no pub)
          formatted.emoji = getItalianVenueEmoji(formatted.type, formatted.name);
          formatted.displayType = getItalianVenueDisplayType(formatted.type);
          formatted.isVeryClose = formatted.distance && formatted.distance < 200;
          formatted.walkingTime = getWalkingTime(formatted.distance);
          
          if (formatted.rating) {
            formatted.ratingStars = '★'.repeat(Math.floor(formatted.rating)) + 
                                   '☆'.repeat(5 - Math.floor(formatted.rating));
            formatted.ratingText = `${formatted.rating}/5`;
          }

          formatted.features = detectItalianFeatures(formatted.name, formatted.type);

          return formatted;
        });

        // UPDATED: Smart sorting for Italian context (no pub priority)
        enhancedPlaces.sort((a, b) => {
          if (a.isVeryClose && b.isVeryClose) {
            return (b.rating || 0) - (a.rating || 0);
          }
          
          if (a.distance < 500 && b.distance >= 500) return -1;
          if (b.distance < 500 && a.distance >= 500) return 1;
          
          return (a.distance || Infinity) - (b.distance || Infinity);
        });

        const enhancedResult = {
          places: enhancedPlaces,
          count: enhancedPlaces.length,
          userLocation: { latitude, longitude },
          searchStats: {
            veryClose: enhancedPlaces.filter(p => p.isVeryClose).length,
            walkable: enhancedPlaces.filter(p => p.distance && p.distance < 1000).length,
            total: enhancedPlaces.length
          }
        };

        lastSearchParamsRef.current = {
          params: { latitude, longitude, radius, type },
          data: enhancedResult,
          timestamp: Date.now()
        };

        return enhancedResult;

      } catch (error) {
        console.error('❌ Failed to fetch Italian venues:', error);
        throw error;
      } finally {
        isSearchingRef.current = false;
      }
    },
    {
      enabled: !!(latitude && longitude && searchKey),
      staleTime: 5 * 60 * 1000,
      cacheTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error?.response?.status === 429) {
          console.log('🛑 Rate limited, not retrying');
          return false;
        }
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: (error) => {
        console.error('❌ Failed to fetch Italian venues:', error);
        isSearchingRef.current = false;
      },
      onSuccess: (data) => {
        console.log('✅ Italian venues data processed:', {
          totalPlaces: data.count,
          veryClose: data.searchStats?.veryClose || 0,
          walkable: data.searchStats?.walkable || 0
        });
      }
    }
  );

  // UPDATED: Italian venue emoji mapping (removed pub emoji)
  const getItalianVenueEmoji = (type, name) => {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    if (nameLower.includes('caffè') || nameLower.includes('caffe')) return '☕';
    
    // REMOVED: pub-specific emojis
    
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  };

  // UPDATED: Italian venue display types (removed pub)
  const getItalianVenueDisplayType = (type) => {
    switch (type) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  };

  // Detect Italian venue features
  const detectItalianFeatures = (name, type) => {
    const nameLower = (name || '').toLowerCase();
    const features = [];
    
    if (nameLower.includes('wifi') || nameLower.includes('internet')) features.push('📶 WiFi');
    if (nameLower.includes('terrazza') || nameLower.includes('giardino')) features.push('🌿 Esterno');
    if (nameLower.includes('colazione') || nameLower.includes('breakfast')) features.push('🌅 Colazione');
    if (nameLower.includes('aperitivo')) features.push('🍸 Aperitivo');
    if (nameLower.includes('sportivo') || nameLower.includes('calcio')) features.push('⚽ Sport');
    if (nameLower.includes('musica') || nameLower.includes('live')) features.push('🎵 Musica');
    
    return features;
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

  // Extract data
  const cafes = data?.places || [];
  const count = data?.count || 0;
  const userLocation = data?.userLocation || null;
  const searchStats = data?.searchStats || { veryClose: 0, walkable: 0, total: 0 };

  // Helper functions for Italian venues
  const getVenuesByType = (venueType) => {
    return cafes.filter(place => place.type === venueType);
  };

  const getVenuesWithinWalkingDistance = (maxMinutes = 10) => {
    const maxDistance = (maxMinutes / 60) * 5 * 1000;
    return cafes.filter(place => place.distance && place.distance <= maxDistance);
  };

  const getTopRatedVenues = (minRating = 4.0, maxCount = 10) => {
    return cafes
      .filter(place => place.rating && place.rating >= minRating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, maxCount);
  };

  const searchVenues = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return cafes.filter(place => 
      place.name.toLowerCase().includes(term) ||
      place.address.toLowerCase().includes(term) ||
      place.displayType?.toLowerCase().includes(term) ||
      place.features?.some(feature => feature.toLowerCase().includes(term))
    );
  };

  const getVenueById = (venueId) => {
    return cafes.find(place => 
      place.id === venueId || place.googlePlaceId === venueId
    );
  };

  // UPDATED: Italian venue statistics (removed pub stats)
  const getItalianVenueStats = () => {
    const stats = {
      total: count,
      byType: {
        caffeterias: getVenuesByType('cafe').length,
        restaurants: getVenuesByType('restaurant').length
        // REMOVED: pubs: getVenuesByType('pub').length
      },
      byDistance: {
        veryClose: searchStats.veryClose,
        walkable: searchStats.walkable,
        nearby: count
      },
      byFeatures: {},
      avgRating: 0,
      topRated: getTopRatedVenues(4.5, 5)
    };

    const ratedVenues = cafes.filter(place => place.rating);
    if (ratedVenues.length > 0) {
      stats.avgRating = ratedVenues.reduce((sum, place) => sum + place.rating, 0) / ratedVenues.length;
      stats.avgRating = Math.round(stats.avgRating * 10) / 10;
    }

    cafes.forEach(place => {
      if (place.features) {
        place.features.forEach(feature => {
          stats.byFeatures[feature] = (stats.byFeatures[feature] || 0) + 1;
        });
      }
    });

    return stats;
  };

  return {
    cafes,
    count,
    userLocation,
    searchStats,
    loading,
    error,
    refetch,
    isFetching,
    
    // Helper functions
    getVenuesByType,
    getVenuesWithinWalkingDistance,
    getTopRatedVenues,
    searchVenues,
    getVenueById,
    getItalianVenueStats,
    
    // Computed values
    hasData: count > 0,
    isEmpty: !loading && count === 0,
    isRefreshing: isFetching && !loading,
    
    // UPDATED: Italian venue specific helpers (removed pub helpers)
    getCaffeterias: () => getVenuesByType('cafe'),
    getRestaurants: () => getVenuesByType('restaurant'),
    // REMOVED: getPubs: () => getVenuesByType('pub'),
    getVeryCloseVenues: () => cafes.filter(p => p.isVeryClose),
    getWalkableVenues: () => getVenuesWithinWalkingDistance(15),
    
    // Performance indicators
    performance: {
      lastSearchTime: lastSearchParamsRef.current?.timestamp,
      cacheHit: !loading && !!data,
      searchInProgress: isSearchingRef.current
    }
  };
};

// UPDATED: Hook for searching Italian venues by text (no pub support)
export const usePlaceSearch = (query, userLocation = null) => {
  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery(
    ['italianPlaceSearch', query?.trim(), userLocation?.latitude, userLocation?.longitude],
    async () => {
      if (!query || query.trim().length < 2) {
        return { places: [], count: 0 };
      }

      console.log('🔍 Searching Italian venues:', { query, userLocation });

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

          formatted.emoji = apiUtils.getTypeEmoji(formatted.type);
          formatted.displayType = getItalianVenueDisplayType(formatted.type);
          
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
        console.error('❌ Italian venue search failed:', error);
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

  const getItalianVenueDisplayType = (type) => {
    switch (type) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  };

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

// UPDATED: Hook for getting Italian venue details (no pub support)
export const usePlaceDetails = (placeId, userLocation = null) => {
  const {
    data: place,
    isLoading: loading,
    error,
    refetch
  } = useQuery(
    ['italianPlaceDetails', placeId],
    async () => {
      if (!placeId) return null;

      console.log('📍 Fetching Italian venue details:', placeId);

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

      formatted.emoji = apiUtils.getTypeEmoji(formatted.type);
      formatted.displayType = getItalianVenueDisplayType(formatted.type);
      
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

  const getItalianVenueDisplayType = (type) => {
    switch (type) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante'; 
      default: return 'Locale';
    }
  };

  return {
    place,
    loading,
    error,
    refetch,
    hasPlace: !!place
  };
};