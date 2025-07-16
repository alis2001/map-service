// App.js - ENHANCED USER DISCOVERY SYSTEM - PRODUCTION READY
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import StartupLoadingScreen from './components/StartupLoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGeolocation } from './hooks/useGeolocation';
import { useCafes } from './hooks/useCafes';
import { healthAPI } from './services/apiService';
import AdvancedSearchPanel from './components/AdvancedSearchPanel';

// USER DISCOVERY COMPONENTS
import UserMarker from './components/UserMarker';
import UserInfoCard from './components/UserInfoCard';
import MapModeToggle from './components/MapModeToggle';
import InviteModal from './components/InviteModal';

import './styles/App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MapApp />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function MapApp() {
  // Backend status
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [appReady, setAppReady] = useState(false);

  // Map mode state (enhanced with city discovery)
  const [mapMode, setMapMode] = useState('places'); // 'people' | 'places'
  const [currentCity, setCurrentCity] = useState(null);

  // Search panel state
  const [searchPanelResults, setSearchPanelResults] = useState([]);
  const [selectedSearchPlace, setSelectedSearchPlace] = useState(null);
  
  // App state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [zoom, setZoom] = useState(15);
  const [searchRadius, setSearchRadius] = useState(2000);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);
  const [isEmbedMode] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationCapability, setLocationCapability] = useState('unknown');

  // Rate limit recovery state
  const [isRateLimitRecovery, setIsRateLimitRecovery] = useState(false);

  // Startup loading state variables
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFullyReady, setIsFullyReady] = useState(false);

  // ENHANCED USER DISCOVERY STATES
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserCard, setShowUserCard] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userDiscoveryStats, setUserDiscoveryStats] = useState(null);

  // ENHANCED INVITATION SYSTEM STATES
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSelectedUser, setInviteSelectedUser] = useState(null);
  const [inviteSelectedPlace, setInviteSelectedPlace] = useState(null);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);

  // ENHANCED AUTHENTICATION
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // ENHANCED CITY DISCOVERY
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  // ENHANCED: Geolocation hook
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    hasLocation,
    isHighAccuracy,
    qualityText,
    sourceText,
    isDetecting,
    detectionMethod,
    refreshLocation,
    getPreciseLocation
  } = useGeolocation();

  // Enhanced cafes hook with better error handling
  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes,
    isRefreshing
  } = useCafes(
    mapCenter?.lat, 
    mapCenter?.lng, 
    searchRadius, 
    cafeType
  );

  // ENHANCED: Authentication initialization with better token management
  useEffect(() => {
    const initializeAuth = () => {
      // Check multiple sources for auth token
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      const tokenFromStorage = localStorage.getItem('caffis_auth_token') || localStorage.getItem('token');
      
      const token = tokenFromUrl || tokenFromStorage;
      
      if (token) {
        setAuthToken(token);
        console.log('🔑 Authentication token found');
        
        // Clean URL if token was in URL
        if (tokenFromUrl) {
          const newUrl = window.location.pathname + window.location.search.replace(/[?&]token=[^&]+/, '').replace(/^&/, '?');
          window.history.replaceState({}, '', newUrl);
          localStorage.setItem('caffis_auth_token', token);
        }
        
        // Fetch user profile
        fetchUserProfile(token);
      } else {
        console.warn('⚠️ No authentication token found');
        setAuthUser(null);
      }
    };

    initializeAuth();
  }, []);

  // ENHANCED: User profile fetching
  const fetchUserProfile = useCallback(async (token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthUser(data.user);
        console.log('👤 User profile loaded:', data.user.firstName);
      } else {
        console.warn('⚠️ Failed to fetch user profile');
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
    }
  }, []);

  // ENHANCED: City-based user discovery with better error handling
  const loadUsersByCity = useCallback(async (cityName, coordinates) => {
    if (!authToken) {
      console.warn('⚠️ No auth token for user discovery');
      return;
    }
    
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      console.log(`🏙️ Loading users in city: ${cityName}`);
      
      let url = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/by-city`;
      const params = new URLSearchParams({
        radius: searchRadius.toString(),
        limit: '50'
      });
      
      if (cityName && cityName !== 'Current Location') {
        params.append('city', cityName);
      } else if (coordinates) {
        params.append('lat', coordinates.lat.toString());
        params.append('lng', coordinates.lng.toString());
      }
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNearbyUsers(data.users || []);
        setCurrentCity(data.city);
        console.log(`✅ Found ${data.users?.length || 0} users in ${data.city?.name}`);
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        setUsersError('Authentication required');
        setAuthToken(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading users by city:', error);
      setUsersError(error.message);
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [authToken, searchRadius]);

  // ENHANCED: Location-based user discovery (fallback)
  const loadNearbyUsers = useCallback(async (lat, lng) => {
    if (!authToken) {
      console.warn('⚠️ No auth token for user discovery');
      return;
    }
    
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      console.log(`🔍 Loading users near: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setNearbyUsers(data.users || []);
        console.log(`✅ Found ${data.users?.length || 0} nearby users`);
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        setUsersError('Authentication required');
        setAuthToken(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading nearby users:', error);
      setUsersError(error.message);
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [authToken, searchRadius]);

  // ENHANCED: Location update with city detection
  const updateUserLocation = useCallback(async (lat, lng) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/location/update-with-city`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          isLive: true,
          shareRadius: searchRadius
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 Location updated:', data.cityDisplayName || 'Unknown');
        
        // Update current city if detected
        if (data.cityDisplayName) {
          setCurrentCity({
            name: data.cityDisplayName,
            coordinates: { lat, lng }
          });
        }
      } else {
        console.warn('⚠️ Failed to update location');
      }
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  }, [authToken, searchRadius]);

  // ENHANCED: Load available cities
  const loadAvailableCities = useCallback(async (query = '') => {
    try {
      const url = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/cities`;
      const params = query ? `?q=${encodeURIComponent(query)}&limit=10` : '?limit=10';
      
      const response = await fetch(`${url}${params}`, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableCities(data.cities || []);
        return data.cities || [];
      }
    } catch (error) {
      console.error('❌ Error loading cities:', error);
    }
    return [];
  }, [authToken]);

  // ENHANCED: Load discovery stats
  const loadDiscoveryStats = useCallback(async () => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/discovery/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserDiscoveryStats(data.stats);
      }
    } catch (error) {
      console.error('❌ Error loading discovery stats:', error);
    }
  }, [authToken]);

  // ENHANCED: Mode change with intelligent data loading
  const handleModeChange = useCallback((mode) => {
    console.log(`🔄 Switching map mode: ${mapMode} → ${mode}`);
    setMapMode(mode);
    
    // Reset selections
    setSelectedUser(null);
    setSelectedCafe(null);
    setShowUserCard(false);
    setIsSelectingPlace(false);
    
    // Load appropriate data
    if (mode === 'people' && mapCenter) {
      if (currentCity && currentCity.name !== 'Current Location') {
        loadUsersByCity(currentCity.name, currentCity.coordinates);
      } else {
        loadNearbyUsers(mapCenter.lat, mapCenter.lng);
      }
      loadDiscoveryStats();
    }
  }, [mapMode, mapCenter, currentCity, loadUsersByCity, loadNearbyUsers, loadDiscoveryStats]);

  // ENHANCED: User profile fetching with caching
  const handleUserClick = useCallback(async (user) => {
    console.log('👤 User selected:', user.firstName);
    setSelectedUser(user);
    
    // Load detailed profile if not already loaded
    if (authToken && (!user.bio || !user.interests)) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/${user.userId}/profile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSelectedUser(data.profile);
        }
      } catch (error) {
        console.error('❌ Error loading user profile:', error);
      }
    }
    
    setShowUserCard(true);
  }, [authToken]);

  // ENHANCED: Invitation system
  const handleInviteUser = useCallback((user) => {
    console.log('☕ Starting invitation for:', user.firstName);
    setInviteSelectedUser(user);
    setShowUserCard(false);
    setShowInviteModal(true);
  }, []);

  const handleSelectPlace = useCallback(() => {
    console.log('📍 Place selection mode activated');
    setIsSelectingPlace(true);
    setMapMode('places');
  }, []);

  const handlePlaceClick = useCallback((place) => {
    if (isSelectingPlace) {
      console.log('✅ Place selected for invitation:', place.name);
      setInviteSelectedPlace({
        id: place.place_id || place.googlePlaceId || place.id,
        name: place.name,
        address: place.address || place.vicinity || place.formatted_address,
        type: place.placeType || place.type || 'cafe'
      });
      setIsSelectingPlace(false);
      setMapMode('people');
    } else {
      setSelectedCafe(place);
    }
  }, [isSelectingPlace]);

  // ENHANCED: Send invitation with better error handling
  const handleSendInvite = useCallback(async (inviteData) => {
    console.log('🚀 Sending invitation:', inviteData);
    
    if (!authToken) {
      alert('Authentication required');
      return;
    }
    
    setInvitationLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/invites/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          toUserId: inviteData.user.userId || inviteData.user.id,
          placeId: inviteData.place.id,
          placeName: inviteData.place.name,
          placeAddress: inviteData.place.address,
          message: inviteData.message,
          meetupTime: inviteData.suggestedTime
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Invitation sent successfully! ☕');
        
        // Reset states
        setShowInviteModal(false);
        setInviteSelectedUser(null);
        setInviteSelectedPlace(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      alert(`Error sending invitation: ${error.message}`);
    } finally {
      setInvitationLoading(false);
    }
  }, [authToken]);

  // ENHANCED: City selection handler
  const handleCitySelect = useCallback((city) => {
    console.log('🏙️ City selected:', city.displayName);
    setSelectedCity(city);
    setCurrentCity({
      name: city.displayName,
      coordinates: city.coordinates
    });
    
    // Update map center
    setMapCenter(city.coordinates);
    setZoom(13);
    
    // Load users if in people mode
    if (mapMode === 'people') {
      loadUsersByCity(city.displayName, city.coordinates);
    }
  }, [mapMode, loadUsersByCity]);

  // Rate limit detection - enhanced
  useEffect(() => {
    if (cafesError && cafesError.message) {
      const isConfirmedRateLimit = 
        cafesError.message.includes('RATE_LIMIT_CONFIRMED:') ||
        cafesError.message.includes('troppe richieste') ||
        cafesError.message.includes('Too Many Requests') ||
        cafesError.message.includes('429') ||
        (cafesError.status === 429);
      
      if (isConfirmedRateLimit && !isRateLimitRecovery) {
        console.log('🚫 Rate limit detected:', cafesError.message);
        setIsRateLimitRecovery(true);
        
        const recoveryTimer = setTimeout(() => {
          console.log('✅ Rate limit recovery completed');
          setIsRateLimitRecovery(false);
          window.location.reload();
        }, 8000);
        
        return () => clearTimeout(recoveryTimer);
      }
    } else {
      setIsRateLimitRecovery(false);
    }
  }, [cafesError, isRateLimitRecovery]);

  // ENHANCED: Backend health check
  const checkBackendHealth = useCallback(async () => {
    try {
      console.log('🔍 Checking backend health...');
      const healthResult = await healthAPI.checkHealth();
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy' || healthResult.status === 'DEGRADED')) {
        console.log('✅ Backend ready');
        setBackendReady(true);
        setBackendError(null);
        return true;
      } else {
        throw new Error(healthResult.error || `Backend status: ${healthResult.status || 'unknown'}`);
      }
    } catch (error) {
      console.warn(`⚠️ Backend not ready:`, error.message);
      setBackendError('Backend starting up...');
      setBackendReady(false);
      return false;
    }
  }, []);

  // ENHANCED: App initialization
  useEffect(() => {
    console.log('🚀 Starting app initialization...');
    setLoadingStage('initializing');
    setLoadingProgress(0);
    
    const initializeApp = async () => {
      // Stage 1: Backend Health Check
      setLoadingProgress(20);
      const backendOk = await checkBackendHealth();
      
      if (backendOk) {
        console.log('✅ Backend ready');
        setLoadingProgress(40);
        setAppReady(true);
        
        // Load initial cities
        loadAvailableCities();
      } else {
        console.log('⚡ App ready with degraded backend');
        setLoadingProgress(30);
        setAppReady(true);
      }
      
      // Stage 2: Location Detection
      setLoadingStage('location');
      setLoadingProgress(50);
    };

    initializeApp();
  }, [checkBackendHealth, loadAvailableCities]);

  // Location stage management
  useEffect(() => {
    if (appReady && !locationRequested && !userLocation && !locationLoading) {
      console.log('📍 Auto-requesting location...');
      setLocationRequested(true);
      setLoadingStage('location');
      setLoadingProgress(60);
      
      if (refreshLocation) {
        refreshLocation();
      }
    }
  }, [appReady, locationRequested, userLocation, locationLoading, refreshLocation]);

  // Location progress tracking
  useEffect(() => {
    if (locationLoading) {
      setLoadingStage('location');
      setLoadingProgress(70);
    } else if (userLocation && hasLocation) {
      setLoadingProgress(80);
    }
  }, [locationLoading, userLocation, hasLocation]);

  // ENHANCED: Map center update with user location sync
  useEffect(() => {
    if (userLocation && hasLocation && !locationLoading) {
      console.log('📍 Setting map center to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6)
      });
      
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Update user location in backend
      updateUserLocation(userLocation.latitude, userLocation.longitude);
      
      // Load appropriate data based on mode
      if (mapMode === 'people') {
        loadUsersByCity('Current Location', {
          lat: userLocation.latitude,
          lng: userLocation.longitude
        });
      }
      
      setLoadingStage('map');
      setLoadingProgress(90);
    }
  }, [userLocation, hasLocation, locationLoading, updateUserLocation, mapMode, loadUsersByCity]);

  // Final readiness check
  useEffect(() => {
    if (appReady && mapCenter && !isRateLimitRecovery) {
      const timer = setTimeout(() => {
        setLoadingStage('ready');
        setLoadingProgress(100);
        setIsFullyReady(true);
        console.log('🎉 App fully ready!');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [appReady, mapCenter, isRateLimitRecovery]);

  // ENHANCED: Search change handler
  const handleSearchChange = useCallback((changes) => {
    console.log('🔍 Search parameters changed:', changes);
    
    if (changes.type !== undefined) {
      setCafeType(changes.type);
    }
    
    if (changes.radius !== undefined) {
      setSearchRadius(parseInt(changes.radius));
    }
    
    // Auto-refetch with new parameters
    setTimeout(() => {
      if (refetchCafes && mapCenter && mapMode === 'places') {
        console.log('🔄 Auto-refetching with new search params');
        refetchCafes();
      } else if (mapCenter && mapMode === 'people') {
        if (currentCity && currentCity.name !== 'Current Location') {
          loadUsersByCity(currentCity.name, currentCity.coordinates);
        } else {
          loadNearbyUsers(mapCenter.lat, mapCenter.lng);
        }
      }
    }, 300);
    
  }, [refetchCafes, mapCenter, mapMode, currentCity, loadUsersByCity, loadNearbyUsers]);

  // Location handlers
  const handleLocationRetry = useCallback(() => {
    console.log('🔄 Retrying location detection...');
    setLocationRequested(false);
    if (refreshLocation) {
      refreshLocation();
    }
  }, [refreshLocation]);

  // ENHANCED: Search place selection
  const handleSearchPlaceSelect = useCallback(async (place) => {
    console.log('🔍 Search place selected:', place);
    
    // Helper function to continue processing after getting coordinates
    const continueWithCoordinates = (lat, lng) => {
      console.log('📍 Final extracted coordinates:', { lat, lng });
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error('❌ Invalid coordinates, cannot proceed');
        return;
      }
      
      // Format the place data
      const formattedPlace = {
        id: place.id || place.googlePlaceId || `search_${Date.now()}`,
        googlePlaceId: place.id || place.googlePlaceId,
        name: place.name,
        address: place.address,
        latitude: lat,
        longitude: lng,
        rating: place.rating,
        priceLevel: place.priceLevel,
        types: place.types || ['establishment'],
        openingHours: place.openingHours,
        photos: place.photos || [],
        distance: place.distance,
        formattedDistance: place.formattedDistance,
        isOpen: place.isOpen,
        location: {
          latitude: lat,
          longitude: lng,
          lat: lat,
          lng: lng
        },
        source: 'search',
        emoji: place.types?.includes('restaurant') ? '🍽️' : '☕',
        type: place.types?.includes('restaurant') ? 'restaurant' : 'cafe',
        placeType: place.types?.includes('restaurant') ? 'restaurant' : 'cafe',
        isSearchResult: true
      };
      
      console.log('🎯 Formatted place for map:', formattedPlace);
      
      if (isSelectingPlace) {
        handlePlaceClick(formattedPlace);
      } else {
        setSelectedCafe(formattedPlace);
        setSelectedSearchPlace(formattedPlace);

        setTimeout(() => {
          console.log('📍 Setting map center to search coordinates:', { lat, lng });
          setMapCenter({ lat: lat, lng: lng });
          setZoom(18);
          
          setTimeout(() => {
            if (refetchCafes) {
              console.log('🔄 Refreshing cafes to show search result');
              refetchCafes();
            }
          }, 100);
        }, 50);
      }
    };

    // Coordinate extraction logic
    let lat, lng;
    
    if (place.id && window.google && window.google.maps && window.google.maps.places) {
      try {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        service.getDetails({
          placeId: place.id,
          fields: ['geometry', 'name', 'formatted_address']
        }, (placeResult, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && placeResult.geometry) {
            lat = placeResult.geometry.location.lat();
            lng = placeResult.geometry.location.lng();
            console.log('📍 Using Google Places API coordinates:', { lat, lng });
            continueWithCoordinates(lat, lng);
          } else {
            console.log('⚠️ Google Places API failed, using fallback coordinates');
            if (place.city && place.city.coordinates) {
              lat = parseFloat(place.city.coordinates.lat);
              lng = parseFloat(place.city.coordinates.lng);
              continueWithCoordinates(lat, lng);
            }
          }
        });
        return;
      } catch (error) {
        console.log('⚠️ Google Places API error:', error);
      }
    }

    // Fallback coordinate extraction
    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
      lat = parseFloat(place.coordinates.lat);
      lng = parseFloat(place.coordinates.lng);
    } else if (place.latitude && place.longitude) {
      lat = parseFloat(place.latitude);
      lng = parseFloat(place.longitude);
    } else if (place.location && place.location.lat && place.location.lng) {
      lat = parseFloat(place.location.lat);
      lng = parseFloat(place.location.lng);
    } else if (place.city && place.city.coordinates) {
      lat = parseFloat(place.city.coordinates.lat);
      lng = parseFloat(place.city.coordinates.lng);
    }

    continueWithCoordinates(lat, lng);
  }, [refetchCafes, isSelectingPlace, handlePlaceClick]);

  const handleSearchResultsUpdate = useCallback((results) => {
    setSearchPanelResults(results);
  }, []);

  const handlePreciseLocation = useCallback(() => {
    console.log('🎯 Requesting precise location...');
    if (getPreciseLocation) {
      getPreciseLocation();
    }
  }, [getPreciseLocation]);

  // Go to user location with smart data loading
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation) {
      console.log('❌ No user location available');
      if (refreshLocation) {
        refreshLocation();
      }
      return;
    }
    
    console.log('📍 Navigating to user location:', userLocation);
    
    setMapCenter({
      lat: userLocation.latitude,
      lng: userLocation.longitude
    });
    
    setTimeout(() => {
      if (mapMode === 'places' && refetchCafes) {
        refetchCafes();
      } else if (mapMode === 'people') {
        loadUsersByCity('Current Location', {
          lat: userLocation.latitude,
          lng: userLocation.longitude
        });
      }
    }, 500);
    
  }, [userLocation, refreshLocation, refetchCafes, mapMode, loadUsersByCity]);

  // ENHANCED: Rate limit recovery screen
  if (isRateLimitRecovery) {
    return (
      <LoadingScreen 
        message="Too fast!"
        subMessage="Reloading the application to get back online..."
        progress={100}
        isRateLimitRecovery={true}
      />
    );
  }

  // ENHANCED: Startup loading screen
  if (!isFullyReady) {
    const getMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Starting application...';
        case 'location': return 'Detecting location...';
        case 'map': return 'Preparing map...';
        case 'ready': return 'Finalizing...';
        default: return 'Loading...';
      }
    };

    const getSubMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Checking backend services';
        case 'location': return qualityText && sourceText ? `${qualityText} • ${sourceText}` : 'Activating GPS';
        case 'map': return 'Configuring map interface';
        case 'ready': return 'Loading local data';
        default: return '';
      }
    };

    return (
      <StartupLoadingScreen
        stage={loadingStage}
        progress={loadingProgress}
        message={getMessage()}
        subMessage={getSubMessage()}
        locationQuality={qualityText}
        onLocationRetry={loadingStage === 'location' ? handleLocationRetry : null}
      />
    );
  }

  // Location error state
  if (!mapCenter && locationError && !locationLoading && appReady) {
    return (
      <StartupLoadingScreen
        stage="location"
        progress={50}
        message="Location required"
        subMessage="To find the best nearby places"
        onLocationRetry={handleLocationRetry}
      />
    );
  }

  // ENHANCED: Main app with user discovery
  return (
    <div className="map-app">
      {/* ENHANCED: Mode toggle with stats */}
      <MapModeToggle
        currentMode={mapMode}
        onModeChange={handleModeChange}
        userCount={nearbyUsers.length}
        placeCount={cafes?.length || 0}
        currentCity={currentCity?.name}
        isLoading={mapMode === 'people' ? usersLoading : cafesLoading}
      />

      {/* ENHANCED: Search panel with city selection */}
      {mapMode === 'places' && (
        <AdvancedSearchPanel
          onPlaceSelect={handleSearchPlaceSelect}
          onCityChange={(cityCoordinates) => {
            console.log('🏙️ City changed from search panel:', cityCoordinates);
            setMapCenter(cityCoordinates);
            setZoom(13);
          }}
          onResultsUpdate={handleSearchResultsUpdate}
          userLocation={userLocation}
          currentMapCenter={mapCenter}
          currentCafeType={cafeType}
          onCafeTypeChange={(newType) => {
            console.log('🔄 Search panel changed cafe type to:', newType);
            setCafeType(newType);
          }}
          className="z-50"
        />
      )}

      {/* ENHANCED: Full page map with user discovery */}
      <FullPageMap
        center={mapCenter}
        zoom={zoom}
        // Enhanced cafes with search results
        cafes={mapMode === 'places' ? (() => {
          const baseCafes = cafes || [];
          if (selectedSearchPlace) {
            const filteredCafes = baseCafes.filter(cafe => cafe.source !== 'search');
            const searchWithMarkerData = {
              ...selectedSearchPlace,
              emoji: selectedSearchPlace.types?.includes('restaurant') ? '🍽️' : '☕',
              type: selectedSearchPlace.types?.includes('restaurant') ? 'restaurant' : 'cafe',
              placeType: selectedSearchPlace.types?.includes('restaurant') ? 'restaurant' : 'cafe',
              isSearchResult: true
            };
            return [...filteredCafes, searchWithMarkerData];
          }
          return baseCafes;
        })() : []}
        // Enhanced users
        users={mapMode === 'people' ? nearbyUsers : []}
        selectedCafe={selectedCafe}
        selectedUser={selectedUser}
        userLocation={userLocation}
        onCafeSelect={(cafe) => {
          if (isSelectingPlace) {
            handlePlaceClick(cafe);
          } else {
            setSelectedCafe(cafe);
          }
        }}
        onUserSelect={handleUserClick}
        onCenterChange={setMapCenter}
        onClosePopup={() => {
          setSelectedCafe(null);
          setSelectedUser(null);
          setShowUserCard(false);
        }}
        loading={mapMode === 'places' ? cafesLoading : usersLoading}
        error={mapMode === 'places' ? cafesError : usersError}
        searchRadius={searchRadius}
        cafeType={cafeType}
        showControls={showControls}
        isEmbedMode={isEmbedMode}
        onSearchChange={handleSearchChange}
        onRefresh={mapMode === 'places' ? refetchCafes : () => {
          if (currentCity && currentCity.name !== 'Current Location') {
            loadUsersByCity(currentCity.name, currentCity.coordinates);
          } else if (mapCenter) {
            loadNearbyUsers(mapCenter.lat, mapCenter.lng);
          }
        }}
        onGoToUserLocation={handleGoToUserLocation}
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod || 'browser'}
        locationCapability={locationCapability}
        onLocationRetry={handleLocationRetry}
        onPreciseLocation={handlePreciseLocation}
        qualityText={qualityText || 'good'}
        sourceText={sourceText || 'GPS'}
        mapMode={mapMode}
        isSelectingPlace={isSelectingPlace}
      />

      {/* ENHANCED: User info card */}
      {showUserCard && selectedUser && (
        <UserInfoCard
          user={selectedUser}
          visible={showUserCard}
          onClose={() => setShowUserCard(false)}
          onInvite={handleInviteUser}
          currentUser={authUser}
        />
      )}

      {/* ENHANCED: Invite modal */}
      {showInviteModal && (
        <InviteModal
          visible={showInviteModal}
          selectedUser={inviteSelectedUser}
          selectedPlace={inviteSelectedPlace}
          onClose={() => {
            setShowInviteModal(false);
            setInviteSelectedUser(null);
            setInviteSelectedPlace(null);
            setIsSelectingPlace(false);
          }}
          onSendInvite={handleSendInvite}
          onSelectPlace={handleSelectPlace}
          isLoading={invitationLoading}
        />
      )}

      {/* Backend status notification */}
      {backendError && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(251, 146, 60, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000
        }}>
          ⚠️ {backendError}
        </div>
      )}

      {/* ENHANCED: Development debug panel */}
      {process.env.REACT_APP_DEBUG_MODE === 'true' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 10000,
          maxWidth: '250px'
        }}>
          <div><strong>Debug Info</strong></div>
          <div>Mode: {mapMode}</div>
          <div>Users: {nearbyUsers.length}</div>
          <div>Places: {cafes?.length || 0}</div>
          <div>City: {currentCity?.name || 'None'}</div>
          <div>Selecting: {isSelectingPlace ? 'Place' : 'Normal'}</div>
          <div>Auth: {authToken ? '✅' : '❌'}</div>
          <div>User: {authUser?.firstName || 'None'}</div>
          {userDiscoveryStats && (
            <div>Stats: {userDiscoveryStats.platform?.online_now || 0} online</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;