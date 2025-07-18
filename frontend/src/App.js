// App.js - ENHANCED USER DISCOVERY SYSTEM WITH LOCATION SELECTION - PRODUCTION READY
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
import PeopleDiscoveryPanel from './components/PeopleDiscoveryPanel';

// USER DISCOVERY COMPONENTS
import UserMarker from './components/UserMarker';
import UserInfoCard from './components/UserInfoCard';
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
  const [mapMode, setMapMode] = useState('people'); // 'people' | 'places'
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

  // NEW: Enhanced modal states for location selection animation
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [isLocationSelecting, setIsLocationSelecting] = useState(false);

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
    allPlaces,
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

  // ENHANCED: Sync user profile to map service - Include preferences and registration date
  const syncProfileToMapService = useCallback(async (userProfile, syncReason = 'update', tokenOverride = null) => {
    const tokenToUse = tokenOverride || authToken;
    
    if (!tokenToUse || !userProfile) {
      console.warn('⚠️ Cannot sync profile - missing token or profile data');
      return false;
    }
    
    try {
      console.log(`🔄 Syncing profile to map service (${syncReason}):`, userProfile.firstName);
      
      const syncData = {
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        profilePic: userProfile.profilePic || null,
        interests: userProfile.interests || [],
        ageRange: userProfile.ageRange || '',
        coffeePersonality: userProfile.coffeePersonality || '',
        conversationTopics: userProfile.conversationTopics || '',
        socialGoals: userProfile.socialGoals || '',
        // NEW: Include additional profile data
        socialEnergy: userProfile.socialEnergy || '',
        groupPreference: userProfile.groupPreference || '',
        locationPreference: userProfile.locationPreference || '',
        meetingFrequency: userProfile.meetingFrequency || '',
        timePreference: userProfile.timePreference || '',
        createdAt: userProfile.createdAt || new Date().toISOString(), // Registration date
        onboardingCompleted: userProfile.onboardingCompleted || false
      };
      
      console.log('📤 Enhanced sync data:', syncData);
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/sync-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Profile synced to map service (${syncReason}):`, data.message);
        return true;
      } else {
        const errorData = await response.json();
        console.warn('⚠️ Failed to sync profile to map service:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error syncing profile to map service:', error);
      return false;
    }
  }, [authToken]);

  const handleInviteHere = useCallback((place) => {
    console.log('🎉 App.js: Invite someone here triggered for:', place?.name);
    
    try {
      // Format the selected place
      const formattedPlace = {
        id: place.id || place.googlePlaceId,
        name: place.name,
        address: place.address || place.vicinity,
        location: place.location,
        type: place.type || place.placeType || 'cafe',
        rating: place.rating,
        distance: place.distance,
        formattedDistance: place.formattedDistance
      };
      
      console.log('📍 Formatted place for invitation:', formattedPlace);
      
      // Set the selected place for invitation
      setInviteSelectedPlace(formattedPlace);
      
      // Clear any selected user (since we're starting from place)
      setInviteSelectedUser(null);
      
      // Close the current popup
      setSelectedCafe(null);
      
      // Switch to people mode for user selection
      setMapMode('people');
      
      // Open the invitation modal in "place → people" mode
      setShowInviteModal(true);
      
      console.log('✅ Place → People invitation flow started');
    } catch (error) {
      console.error('❌ Error in handleInviteHere:', error);
    }
  }, []);

  // ENHANCED: User profile fetching
  const fetchUserProfile = useCallback(async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthUser(data.user);
        console.log('👤 User profile loaded:', data.user.firstName);
        
        // Automatically sync profile to map service on login - Pass token directly
        await syncProfileToMapService(data.user, 'login', token);
      } else {
        console.warn('⚠️ Failed to fetch user profile');
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
    }
  }, [syncProfileToMapService]);

  const loadUsersByCity = useCallback(async (cityName, coordinates) => {
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      console.log(`🏙️ Loading users in city: ${cityName}`);
      
      // Use the NEW working endpoint
      const lat = coordinates?.lat || mapCenter?.lat;
      const lng = coordinates?.lng || mapCenter?.lng;
      
      if (!lat || !lng) {
        throw new Error('Coordinates required');
      }
      
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/user/search?lat=${lat}&lng=${lng}&radius=${searchRadius}&limit=50`,
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
        setCurrentCity({ name: cityName, coordinates: { lat, lng } });
        console.log(`✅ Found ${data.users?.length || 0} users in ${cityName}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading users by city:', error);
      setUsersError(error.message);
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [searchRadius, mapCenter, authToken]);

  const loadNearbyUsers = useCallback(async (lat, lng) => {
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      console.log(`🔍 Loading users near: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/user/search?lat=${lat}&lng=${lng}&radius=${searchRadius}&limit=50`,
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
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading nearby users:', error);
      setUsersError(error.message);
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [searchRadius, authToken]);

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
      const url = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/cities`;
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

  // ENHANCED: Mode change handler with proper search control
  const handleModeChange = useCallback((newMode) => {
    console.log(`🔄 Switching map mode from ${mapMode} to ${newMode}`);
    
    // Prevent unnecessary changes
    if (mapMode === newMode) return;
    
    // Clear current selections and states
    setSelectedCafe(null);
    setSelectedUser(null);
    setShowUserCard(false);
    setSelectedSearchPlace(null);
    setIsSelectingPlace(false);
    
    setUsersError(null);
    
    // Stop any ongoing API calls by setting loading states
    if (newMode === 'places') {
      // Stop user searches and prepare for place searches
      console.log('🏪 Switching to places mode - stopping user API calls');
      setUsersLoading(false);
      setUsersError(null);
      setNearbyUsers([]); // Clear users to stop any rendering
      
      // Update mode
      setMapMode(newMode);
      
      // Load places data if location is available
      if (mapCenter && refetchCafes) {
        console.log('📍 Loading cafes for places mode');
        setTimeout(() => refetchCafes(), 300); // Small delay to ensure mode is set
      }
    } else if (newMode === 'people') {
      // Stop place searches and prepare for user searches
      console.log('👥 Switching to people mode - stopping places API calls');
      
      // Update mode first
      setMapMode(newMode);
      
      // Load users data if location is available
      if (mapCenter) {
        console.log('📍 Loading users for people mode');
        if (currentCity && currentCity.name !== 'Current Location') {
          setTimeout(() => loadUsersByCity(currentCity.name, currentCity.coordinates), 300);
        } else {
          setTimeout(() => loadNearbyUsers(mapCenter.lat, mapCenter.lng), 300);
        }
        // Load discovery stats
        setTimeout(() => loadDiscoveryStats(), 500);
      }
    }
  }, [mapMode, mapCenter, currentCity, refetchCafes, loadUsersByCity, loadNearbyUsers, loadDiscoveryStats]);

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

  const handleLocationSelectionStart = useCallback(() => {
    console.log('📍 App.js: Location selection mode activated');
    console.log('🔍 Current state before activation:', {
      isLocationSelecting,
      isSelectingPlace,
      mapMode,
      isModalMinimized
    });
    
    setIsLocationSelecting(true);
    setIsSelectingPlace(true);
    setIsModalMinimized(true);
    setMapMode('places'); // Switch to places mode for location selection
    
    console.log('✅ Location selection state updated');
  }, [isLocationSelecting, isSelectingPlace, mapMode, isModalMinimized]);

  const handleLocationSelectionEnd = useCallback(() => {
    console.log('✅ App.js: Location selection completed');
    console.log('🔍 Current state before cleanup:', {
      isLocationSelecting,
      isSelectingPlace,
      mapMode,
      isModalMinimized,
      inviteSelectedPlace
    });
    
    setIsLocationSelecting(false);
    setIsSelectingPlace(false);
    setIsModalMinimized(false);
    setMapMode('people'); // Switch back to people mode
    
    console.log('✅ Location selection cleanup completed');
  }, [isLocationSelecting, isSelectingPlace, mapMode, isModalMinimized, inviteSelectedPlace]);

  const handlePlaceClick = useCallback((place) => {
    console.log('🎯 App.js: handlePlaceClick called with:', place?.name);
    console.log('🔍 isSelectingPlace:', isSelectingPlace);
    
    if (isSelectingPlace) {
      console.log('✅ Place selected for invitation:', place.name);
      
      try {
        // Format the selected place
        const formattedPlace = {
          id: place.id || place.googlePlaceId,
          name: place.name,
          address: place.address || place.vicinity,
          location: place.location,
          type: place.type || place.placeType || 'cafe',
          rating: place.rating,
          distance: place.distance,
          formattedDistance: place.formattedDistance
        };

        console.log('📍 Formatted place:', formattedPlace);
        
        // Set the selected place for invitation
        setInviteSelectedPlace(formattedPlace);
        
        // Close the map popup
        setSelectedCafe(null);
        
        // End location selection mode
        setIsLocationSelecting(false);
        setIsSelectingPlace(false);
        setIsModalMinimized(false);
        
        // Switch back to people mode
        setMapMode('people');
        
        console.log('✅ Place selection completed successfully');
      } catch (error) {
        console.error('❌ Error in handlePlaceClick:', error);
      }
    } else {
      console.log('ℹ️ Not in selection mode - setting selected cafe normally');
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
          toUserId: inviteData.toUser.userId || inviteData.toUser.id,
          placeId: inviteData.place.id,
          placeName: inviteData.place.name,
          placeAddress: inviteData.place.address,
          message: inviteData.message,
          meetupTime: `${inviteData.date} ${inviteData.time}:00`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Invito inviato con successo! ☕');
        
        // Add to active invitations
        const newInvitation = {
          id: data.inviteId || Date.now(),
          toUser: inviteData.toUser,
          place: inviteData.place,
          date: inviteData.date,
          time: inviteData.time,
          message: inviteData.message,
          status: 'pending',
          createdAt: new Date()
        };
        
        // Reset states
        setShowInviteModal(false);
        setInviteSelectedUser(null);
        setInviteSelectedPlace(null);
        setIsLocationSelecting(false);
        setIsSelectingPlace(false);
        setIsModalMinimized(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      alert(`Errore nell'invio dell'invito: ${error.message}`);
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

  useEffect(() => {
    window.handleInviteHereFromPopup = handleInviteHere;
    return () => {
      delete window.handleInviteHereFromPopup;
    };
  }, [handleInviteHere]);

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

  useEffect(() => {
    // Prevent multiple initializations
    if (appReady) return;
    
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
        setTimeout(() => loadAvailableCities(), 1000); // Delay to prevent rate limit
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
  }, []); // Remove dependencies to prevent multiple calls

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
      
      // Debounce location updates to prevent rate limiting
      const updateTimer = setTimeout(() => {
        updateUserLocation(userLocation.latitude, userLocation.longitude);
      }, 2000);
      
      // Load appropriate data based on mode with delay
      if (mapMode === 'people') {
        setTimeout(() => {
          loadUsersByCity('Current Location', {
            lat: userLocation.latitude,
            lng: userLocation.longitude
          });
        }, 3000);
      }
      
      setLoadingStage('map');
      setLoadingProgress(90);
      
      return () => clearTimeout(updateTimer);
    }
  }, [userLocation?.latitude, userLocation?.longitude, hasLocation, locationLoading, mapMode]);

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

  // Expose handlePlaceClick to be called from popup
  useEffect(() => {
    window.handlePlaceClickFromPopup = handlePlaceClick;
    return () => {
      delete window.handlePlaceClickFromPopup;
    };
  }, [handlePlaceClick]);

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
      {/* Simple mode toggle - top left */}
      <div className="simple-mode-toggle">
        <button 
          className={`mode-btn ${mapMode === 'places' ? 'active' : ''}`}
          onClick={() => handleModeChange('places')}
        >
          🏪 Luoghi ({cafes?.length || 0})
        </button>
        <button 
          className={`mode-btn ${mapMode === 'people' ? 'active' : ''}`}
          onClick={() => handleModeChange('people')}
        >
          👥 Persone ({nearbyUsers.length})
        </button>
      </div>

      {/* ENHANCED: Search panel - only visible in places mode */}
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
          className="z-50 advanced-search-panel search-panel-container"
        />
      )}

      {/* ENHANCED: People Discovery Panel - only visible in people mode */}
      {mapMode === 'people' && (
        <PeopleDiscoveryPanel
          users={nearbyUsers}
          currentCity={currentCity}
          userLocation={userLocation}
          onUserSelect={handleUserClick}
          isLoading={usersLoading}
          searchRadius={searchRadius}
          onRadiusChange={(newRadius) => {
            setSearchRadius(newRadius);
            // Reload users with new radius
            if (currentCity && currentCity.name !== 'Current Location') {
              loadUsersByCity(currentCity.name, currentCity.coordinates);
            } else if (mapCenter) {
              loadNearbyUsers(mapCenter.lat, mapCenter.lng);
            }
          }}
          totalOnline={userDiscoveryStats?.platform?.online_now || 0}
          className="z-50 people-discovery-panel search-panel-container"
        />
      )}

      {/* ENHANCED: Full page map with conditional controls */}
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
          console.log('🎯 App.js: onCafeSelect called with:', cafe?.name);
          console.log('🔍 isSelectingPlace:', isSelectingPlace);
          
          if (isSelectingPlace) {
            // In location selection mode, ALWAYS show the popup first
            console.log('📍 Location selection mode - showing popup for place info');
            setSelectedCafe(cafe);
          } else {
            // Normal mode - just set selected cafe
            console.log('ℹ️ Normal mode - setting selected cafe');
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
        showControls={mapMode === 'places'} // Only show controls in places mode
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


      {/* ENHANCED: Invite modal with location selection animation */}
      {showInviteModal && (
        <InviteModal
          visible={showInviteModal}
          selectedUser={inviteSelectedUser}
          selectedPlace={inviteSelectedPlace}
          cafeType={cafeType}
          onCafeTypeChange={(newType) => {
            console.log('🔄 App: InviteModal changed cafeType to:', newType);
            setCafeType(newType);
            setTimeout(() => {
              if (refetchCafes && mapCenter && mapMode === 'places') {
                console.log('🔄 Auto-refetching with new type from InviteModal');
                refetchCafes();
              }
            }, 300);
          }}
          onClose={() => {
            setShowInviteModal(false);
            setInviteSelectedUser(null);
            setInviteSelectedPlace(null);
            setIsSelectingPlace(false);
            setIsLocationSelecting(false);
            setIsModalMinimized(false);
          }}
          onSendInvite={handleSendInvite}
          userLocation={userLocation}
          cafes={(() => {
            if (allPlaces && allPlaces.length > 0) {
              console.log('📍 InviteModal: Using allPlaces data:', allPlaces.length, 'places');
              return allPlaces;
            } else if (cafes && cafes.length > 0) {
              console.log('📍 InviteModal: Using filtered cafes data:', cafes.length, 'places');
              return cafes;
            } else {
              console.log('📍 InviteModal: No places data available');
              return [];
            }
          })()}
          onRefreshPlaces={refetchCafes}
          onLocationSelectionStart={() => {
            console.log('🎯 App: Location selection started from InviteModal');
            setIsModalMinimized(true);
            setIsLocationSelecting(true);
            setIsSelectingPlace(true);
            setMapMode('places');
          }}
          onLocationSelectionEnd={() => {
            console.log('🎯 App: Location selection ended from InviteModal');
            setIsModalMinimized(false);
            setIsLocationSelecting(false);
            setIsSelectingPlace(false);
            setMapMode('people');
          }}
          onClearPlace={() => {
            console.log('🗑️ App: Clearing selected place');
            setInviteSelectedPlace(null);
          }}
          isLocationSelecting={isLocationSelecting}
          isMinimized={isModalMinimized}
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

      {/* Simple mode toggle styles */}
      <style jsx>{`
        .simple-mode-toggle {
          position: absolute;
          top: 80px;
          left: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 6px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          z-index: 2000;
          display: flex;
          gap: 4px;
        }

        .mode-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mode-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .mode-btn:hover:not(.active) {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        @media (max-width: 768px) {
          .simple-mode-toggle {
            left: 10px;
            top: 10px;
          }
          
          .mode-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      `}</style>

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
          <div>Minimized: {isModalMinimized ? 'Yes' : 'No'}</div>
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