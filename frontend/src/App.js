// App.js - VERSIONE INTEGRATA CON SCOPERTA UTENTI - COMPLETA - FIXED API URLS
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

// NUOVI COMPONENTI PER SCOPERTA UTENTI
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

  // NUOVO: Modalità mappa (persone vs luoghi)
  const [mapMode, setMapMode] = useState('places'); // 'people' o 'places'

  // Search panel state
  const [searchPanelResults, setSearchPanelResults] = useState([]);
  const [selectedSearchPlace, setSelectedSearchPlace] = useState(null);
  
  // App state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState(null); // No default center
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

  // NUOVI STATI PER GESTIONE UTENTI
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserCard, setShowUserCard] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // NUOVI STATI PER SISTEMA INVITI
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSelectedUser, setInviteSelectedUser] = useState(null);
  const [inviteSelectedPlace, setInviteSelectedPlace] = useState(null);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);

  // NUOVO: Token autenticazione
  const [authToken, setAuthToken] = useState(null);

  // 🚀 **ULTRA-FAST GEOLOCATION HOOK**
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

  // Only fetch cafes when we have a real user location
  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes,
    isRefreshing // from enhanced useCafes hook
  } = useCafes(
    mapCenter?.lat, 
    mapCenter?.lng, 
    searchRadius, 
    cafeType
  );

  // NUOVA FUNZIONE: Inizializzazione token
  useEffect(() => {
    // Ottieni token dall'URL o localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const tokenFromStorage = localStorage.getItem('caffis_auth_token');
    
    const token = tokenFromUrl || tokenFromStorage;
    if (token) {
      setAuthToken(token);
      console.log('🔑 Token autenticazione trovato');
    } else {
      console.warn('⚠️ Nessun token di autenticazione trovato');
    }
  }, []);

  // NUOVE FUNZIONI PER GESTIONE UTENTI - FIXED API URL
  const loadNearbyUsers = useCallback(async (lat, lng) => {
    if (!authToken) {
      console.warn('⚠️ Nessun token per caricare utenti');
      return;
    }
    
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      console.log(`🔍 Caricamento utenti vicino a: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
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
        console.log(`✅ Trovati ${data.users?.length || 0} utenti nelle vicinanze`);
      } else if (response.status === 401) {
        console.error('❌ Token di autenticazione non valido');
        setUsersError('Autenticazione richiesta');
      } else {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Errore caricamento utenti:', error);
      setUsersError(error.message);
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [authToken, searchRadius]);

  // FIXED API URL - updateUserLocation
  const updateUserLocation = useCallback(async (lat, lng) => {
    if (!authToken) return;
    
    try {
      await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/location/update`, {
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
      console.log('📍 Posizione utente aggiornata nel backend');
    } catch (error) {
      console.error('❌ Errore aggiornamento posizione:', error);
    }
  }, [authToken, searchRadius]);

  // NUOVI GESTORI EVENTI
  const handleModeChange = useCallback((mode) => {
    console.log(`🔄 Cambio modalità mappa: ${mapMode} → ${mode}`);
    setMapMode(mode);
    
    // Reset selezioni
    setSelectedUser(null);
    setSelectedCafe(null);
    setShowUserCard(false);
    
    // Carica dati appropriati
    if (mode === 'people' && mapCenter) {
      loadNearbyUsers(mapCenter.lat, mapCenter.lng);
    }
  }, [mapMode, mapCenter, loadNearbyUsers]);

  // FIXED API URL - handleUserClick
  const handleUserClick = useCallback(async (user) => {
    console.log('👤 Utente selezionato:', user.firstName);
    setSelectedUser(user);
    
    // Carica profilo dettagliato
    if (authToken) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/users/${user.id}/profile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSelectedUser(data.profile);
          setShowUserCard(true);
        } else {
          // Mostra comunque la card con dati base
          setShowUserCard(true);
        }
      } catch (error) {
        console.error('❌ Errore caricamento profilo:', error);
        setShowUserCard(true);
      }
    } else {
      setShowUserCard(true);
    }
  }, [authToken]);

  const handleInviteUser = useCallback((user) => {
    console.log('☕ Avvio invito per:', user.firstName);
    setInviteSelectedUser(user);
    setShowUserCard(false);
    setShowInviteModal(true);
  }, []);

  const handleSelectPlace = useCallback(() => {
    console.log('📍 Modalità selezione posto attivata');
    setIsSelectingPlace(true);
    setMapMode('places'); // Passa alla visualizzazione luoghi
  }, []);

  const handlePlaceClick = useCallback((place) => {
    if (isSelectingPlace) {
      // Modalità selezione per invito
      console.log('✅ Posto selezionato per invito:', place.name);
      setInviteSelectedPlace({
        id: place.place_id || place.googlePlaceId || place.id,
        name: place.name,
        address: place.address || place.vicinity
      });
      setIsSelectingPlace(false);
      setMapMode('people'); // Torna alla visualizzazione persone
    } else {
      // Visualizzazione normale
      setSelectedCafe(place);
    }
  }, [isSelectingPlace]);

  // FIXED API URL - handleSendInvite
  const handleSendInvite = useCallback(async (inviteData) => {
    console.log('🚀 Invio invito:', inviteData);
    
    if (!authToken) {
      alert('Token di autenticazione mancante');
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/invites/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          toUserId: inviteData.user.id,
          placeId: inviteData.place.id,
          placeName: inviteData.place.name,
          placeAddress: inviteData.place.address,
          message: inviteData.message,
          meetupTime: inviteData.suggestedTime
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        
        // Reset stati
        setShowInviteModal(false);
        setInviteSelectedUser(null);
        setInviteSelectedPlace(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'invio');
      }
    } catch (error) {
      console.error('❌ Errore invio invito:', error);
      alert(`Errore nell'invio dell'invito: ${error.message}`);
    }
  }, [authToken]);

  // Rate limit detection - ONLY for confirmed API errors
  useEffect(() => {
    if (cafesError && cafesError.message) {
      // VERY PRECISE detection - only trigger on confirmed rate limit message
      const isConfirmedRateLimit = 
        cafesError.message.includes('RATE_LIMIT_CONFIRMED:') ||
        cafesError.message.includes('troppe richieste') ||
        cafesError.message.includes('Too Many Requests') ||
        cafesError.message.includes('429') ||
        (cafesError.status === 429);
      
      if (isConfirmedRateLimit && !isRateLimitRecovery) {
        console.log('🚫 CONFIRMED Rate limit detected:', cafesError.message);
        setIsRateLimitRecovery(true);
        
        // Auto-recovery after 8 seconds
        const recoveryTimer = setTimeout(() => {
          console.log('✅ Rate limit recovery completed, reloading...');
          setIsRateLimitRecovery(false);
          window.location.reload();
        }, 8000);
        
        return () => clearTimeout(recoveryTimer);
      }
    } else {
      // Clear rate limit recovery if error is resolved
      setIsRateLimitRecovery(false);
    }
  }, [cafesError, isRateLimitRecovery]);

  // 🏥 **BACKEND HEALTH CHECK**
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

  // 🚀 **APP INITIALIZATION WITH LOADING STAGES**
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
      } else {
        // Continue with degraded mode
        console.log('⚡ App ready with degraded backend');
        setLoadingProgress(30);
        setAppReady(true);
      }
      
      // Stage 2: Location Detection
      setLoadingStage('location');
      setLoadingProgress(50);
    };

    initializeApp();
  }, [checkBackendHealth]);

  // 📍 **LOCATION STAGE MANAGEMENT**
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

  // 📍 **LOCATION PROGRESS TRACKING**
  useEffect(() => {
    if (locationLoading) {
      setLoadingStage('location');
      setLoadingProgress(70);
    } else if (userLocation && hasLocation) {
      setLoadingProgress(80);
    }
  }, [locationLoading, userLocation, hasLocation]);

  // 🗺️ **MAP CENTER UPDATE AND STAGE PROGRESSION**
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
      
      // NUOVO: Aggiorna posizione nel backend e carica utenti se necessario
      updateUserLocation(userLocation.latitude, userLocation.longitude);
      
      if (mapMode === 'people') {
        loadNearbyUsers(userLocation.latitude, userLocation.longitude);
      }
      
      // Move to map stage
      setLoadingStage('map');
      setLoadingProgress(90);
    }
  }, [userLocation, hasLocation, locationLoading, updateUserLocation, loadNearbyUsers, mapMode]);

  // 🗺️ **FINAL READINESS CHECK**
  useEffect(() => {
    // App is fully ready when we have a map center and not in rate limit recovery
    if (appReady && mapCenter && !isRateLimitRecovery) {
      // Small delay to ensure everything is settled
      const timer = setTimeout(() => {
        setLoadingStage('ready');
        setLoadingProgress(100);
        setIsFullyReady(true);
        console.log('🎉 App fully ready!');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [appReady, mapCenter, isRateLimitRecovery]);

  // 🔄 **SEARCH CHANGE HANDLER**
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
        loadNearbyUsers(mapCenter.lat, mapCenter.lng);
      }
    }, 300);
    
  }, [refetchCafes, mapCenter, mapMode, loadNearbyUsers]);

  // 📍 **LOCATION HANDLERS**
  const handleLocationRetry = useCallback(() => {
    console.log('🔄 Retrying location detection...');
    setLocationRequested(false);
    if (refreshLocation) {
      refreshLocation();
    }
  }, [refreshLocation]);

  const handleSearchPlaceSelect = useCallback(async (place) => {
    console.log('🔍 Search place selected:', place);
    console.log('🔍 Raw place object:', JSON.stringify(place, null, 2));
    
    // Helper function to continue processing after getting coordinates
    const continueWithCoordinates = (lat, lng) => {
      console.log('📍 Final extracted coordinates:', { lat, lng });
      console.log('📍 Coordinates valid?', { 
        lat: !isNaN(lat) && lat !== null && lat !== undefined,
        lng: !isNaN(lng) && lng !== null && lng !== undefined
      });
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error('❌ Invalid coordinates, cannot proceed');
        return;
      }
      
      // Format the place data to match the existing cafe structure
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
          lat: lat,      // Keep both formats for compatibility
          lng: lng
        },
        source: 'search',
        // Add marker-specific fields
        emoji: place.types?.includes('restaurant') ? '🍽️' : '☕',
        type: place.types?.includes('restaurant') ? 'restaurant' : 'cafe',
        placeType: place.types?.includes('restaurant') ? 'restaurant' : 'cafe',
        isSearchResult: true
      };
      
      console.log('🎯 Formatted place for map:', formattedPlace);
      
      // IMPORTANT: Set selected cafe FIRST
      if (isSelectingPlace) {
        handlePlaceClick(formattedPlace);
      } else {
        setSelectedCafe(formattedPlace);
        setSelectedSearchPlace(formattedPlace);

        // Add the search result to cafe markers
        console.log('🎯 Adding search result to cafe markers');
        
        // Then update map center with a slight delay to ensure state updates
        setTimeout(() => {
          console.log('📍 Setting map center to exact search coordinates:', { lat, lng });
          setMapCenter({
            lat: lat,
            lng: lng
          });
          
          // Force high zoom for search results
          setZoom(18);
          
          // Force a refresh of the cafes to ensure the marker appears
          setTimeout(() => {
            if (refetchCafes) {
              console.log('🔄 Refreshing cafes to show search result marker');
              refetchCafes();
            }
          }, 100);
          
          // Additional: Force map to pan to exact location after everything loads
          setTimeout(() => {
            console.log('🎯 Final positioning to search result coordinates');
            setMapCenter({
              lat: lat,
              lng: lng
            });
          }, 500);
        }, 50);
      }
      
      console.log('✅ Search place integration completed');
    };

    // More robust coordinate extraction - check all possible formats
    let lat, lng;
    
    console.log('🔍 Getting exact coordinates for place:', place.name);

    // If we have the place ID, use Google Places API to get exact coordinates
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
            
            // Continue with the rest of the function
            continueWithCoordinates(lat, lng);
          } else {
            console.log('⚠️ Google Places API failed, using city coordinates');
            if (place.city && place.city.coordinates) {
              lat = parseFloat(place.city.coordinates.lat);
              lng = parseFloat(place.city.coordinates.lng);
              continueWithCoordinates(lat, lng);
            }
          }
        });
        return; // Exit early, continue in callback
      } catch (error) {
        console.log('⚠️ Google Places API error:', error);
      }
    }

    // Try different coordinate formats from search results (if Google Places API not available)
    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
      lat = parseFloat(place.coordinates.lat);
      lng = parseFloat(place.coordinates.lng);
      console.log('📍 Using coordinates object (primary):', { lat, lng });
    } else if (place.latitude && place.longitude) {
      lat = parseFloat(place.latitude);
      lng = parseFloat(place.longitude);
      console.log('📍 Using direct lat/lng:', { lat, lng });
    } else if (place.location && place.location.lat && place.location.lng) {
      lat = parseFloat(place.location.lat);
      lng = parseFloat(place.location.lng);
      console.log('📍 Using location object:', { lat, lng });
    } else if (place.location && place.location.latitude && place.location.longitude) {
      lat = parseFloat(place.location.latitude);
      lng = parseFloat(place.location.longitude);
      console.log('📍 Using location object (lat/long format):', { lat, lng });
    } else {
      console.log('⚠️ No place coordinates found, using city coordinates as fallback');
      if (place.city && place.city.coordinates) {
        lat = parseFloat(place.city.coordinates.lat);
        lng = parseFloat(place.city.coordinates.lng);
        console.log('📍 Using city coordinates as fallback:', { lat, lng });
      }
    }

    // Continue with extracted coordinates
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

  // Go to user location handler with smooth animation
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation) {
      console.log('❌ No user location available');
      if (refreshLocation) {
        refreshLocation();
      }
      return;
    }
    
    console.log('📍 Navigating to user location:', userLocation);
    
    // Update map center to user location
    setMapCenter({
      lat: userLocation.latitude,
      lng: userLocation.longitude
    });
    
    // Trigger a refresh based on current mode
    setTimeout(() => {
      if (mapMode === 'places' && refetchCafes) {
        refetchCafes();
      } else if (mapMode === 'people') {
        loadNearbyUsers(userLocation.latitude, userLocation.longitude);
      }
    }, 500); // Small delay to ensure map center is updated
    
  }, [userLocation, refreshLocation, refetchCafes, mapMode, loadNearbyUsers]);

  // 1. Rate limit recovery screen (highest priority) - ONLY for confirmed API errors
  if (isRateLimitRecovery) {
    return (
      <LoadingScreen 
        message="Troppo veloce!"
        subMessage="Sto ricaricando l'applicazione per tornare operativo..."
        progress={100}
        isRateLimitRecovery={true}
      />
    );
  }

  // 2. Creative startup loading screen (before map is ready)
  if (!isFullyReady) {
    const getMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Avvio applicazione...';
        case 'location': return 'Rilevamento posizione...';
        case 'map': return 'Preparazione mappa...';
        case 'ready': return 'Finalizzazione...';
        default: return 'Caricamento...';
      }
    };

    const getSubMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Controllo servizi backend';
        case 'location': return qualityText && sourceText ? `${qualityText} • ${sourceText}` : 'Attivazione GPS';
        case 'map': return 'Configurazione interfaccia mappa';
        case 'ready': return 'Caricamento dati locali';
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

  // 3. Location error state (if location failed and no map center)
  if (!mapCenter && locationError && !locationLoading && appReady) {
    return (
      <StartupLoadingScreen
        stage="location"
        progress={50}
        message="Posizione richiesta"
        subMessage="Per trovare i migliori locali nelle vicinanze"
        onLocationRetry={handleLocationRetry}
      />
    );
  }

  // ❌ **FALLBACK ERROR STATE**
  if (!mapCenter && locationError && !locationLoading) {
    return (
      <div className="map-app">
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '400px',
          width: '90%'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          <h3 style={{ marginBottom: '12px', color: '#1F2937' }}>Posizione richiesta</h3>
          <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.5' }}>
            Per trovare i migliori locali nelle vicinanze, abbiamo bisogno della tua posizione.
          </p>
          <button
            onClick={handleLocationRetry}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            📍 Consenti Posizione
          </button>
        </div>
      </div>
    );
  }

  // 🗺️ **MAIN APP WITH MAP**
  return (
    <div className="map-app">
      {/* NUOVO: Toggle modalità mappa */}
      <MapModeToggle
        currentMode={mapMode}
        onModeChange={handleModeChange}
        userCount={nearbyUsers.length}
        placeCount={cafes?.length || 0}
      />

      {/* Pannello ricerca - solo in modalità luoghi */}
      {mapMode === 'places' && (
        <AdvancedSearchPanel
          onPlaceSelect={handleSearchPlaceSelect}
          onCityChange={(cityCoordinates) => {
            console.log('🏙️ City changed, updating map center:', cityCoordinates);
            setMapCenter(cityCoordinates);
            setZoom(13); // City-level zoom
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

      <FullPageMap
        center={mapCenter}
        zoom={zoom}
        // MODIFICATO: Cafes solo in modalità places
        cafes={mapMode === 'places' ? (() => {
          const baseCafes = cafes || [];
          if (selectedSearchPlace) {
            // Remove any existing search results to avoid duplicates
            const filteredCafes = baseCafes.filter(cafe => cafe.source !== 'search');
            // Add the new search result with proper marker structure
            const searchWithMarkerData = {
              ...selectedSearchPlace,
              // Ensure all required marker fields are present
              emoji: selectedSearchPlace.types?.includes('restaurant') ? '🍽️' : '☕',
              type: selectedSearchPlace.types?.includes('restaurant') ? 'restaurant' : 'cafe',
              placeType: selectedSearchPlace.types?.includes('restaurant') ? 'restaurant' : 'cafe',
              isSearchResult: true
            };
            console.log('🎯 Adding search marker to map:', searchWithMarkerData.name);
            return [...filteredCafes, searchWithMarkerData];
          }
          return baseCafes;
        })() : []}
        // NUOVO: Aggiungi utenti
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
        // NUOVO: Gestore selezione utenti
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
        onRefresh={mapMode === 'places' ? refetchCafes : () => loadNearbyUsers(mapCenter.lat, mapCenter.lng)}
        onGoToUserLocation={handleGoToUserLocation}
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod || 'browser'}
        locationCapability={locationCapability}
        onLocationRetry={handleLocationRetry}
        onPreciseLocation={handlePreciseLocation}
        qualityText={qualityText || 'good'}
        sourceText={sourceText || 'GPS'}
        // NUOVO: Passa modalità mappa e stato selezione
        mapMode={mapMode}
        isSelectingPlace={isSelectingPlace}
      />

      {/* NUOVO: Card informazioni utente */}
      {showUserCard && selectedUser && (
        <UserInfoCard
          user={selectedUser}
          visible={showUserCard}
          onClose={() => setShowUserCard(false)}
          onInvite={handleInviteUser}
        />
      )}

      {/* NUOVO: Modal invito */}
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
        />
      )}

      {/* 🏥 Backend Status Toast */}
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

      {/* NUOVO: Debug info per sviluppo */}
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
          zIndex: 10000
        }}>
          <div>Modalità: {mapMode}</div>
          <div>Utenti: {nearbyUsers.length}</div>
          <div>Luoghi: {cafes?.length || 0}</div>
          <div>Selezione: {isSelectingPlace ? 'Posto' : 'Normale'}</div>
          <div>Token: {authToken ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  );
}

export default App;