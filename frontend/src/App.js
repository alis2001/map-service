// App.js - UPDATED VERSION with Backend Health Check & GPS Initialization
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGeolocation } from './hooks/useGeolocation';
import { useCafes } from './hooks/useCafes';
import { healthAPI } from './services/apiService';
import './styles/App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
  // NEW: Initialization states
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [initializationStep, setInitializationStep] = useState('starting'); // 'starting', 'backend', 'gps', 'ready'
  const [initializationProgress, setInitializationProgress] = useState(0);
  
  // Existing state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LAT) || 45.0703,
    lng: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LNG) || 7.6869
  });
  const [zoom, setZoom] = useState(parseInt(process.env.REACT_APP_DEFAULT_ZOOM) || 15);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);

  // Custom hooks
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    permissionGranted,
    shouldShowLocationModal,
    requestLocation,
    requestFreshGPS, // FIXED: Add this
    clearPermissionDenied
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // NEW: Backend health check with retries and progress tracking
  const checkBackendHealth = async (retryCount = 0) => {
    try {
      console.log(`🔍 Checking backend health (attempt ${retryCount + 1})`);
      setInitializationStep('backend');
      setInitializationProgress(20 + (retryCount * 10)); // Show progress
      
      const healthResult = await healthAPI.checkHealth();
      console.log('🏥 Backend health result:', healthResult);
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy')) {
        console.log('✅ Backend is healthy and ready');
        setBackendReady(true);
        setBackendError(null);
        setInitializationProgress(50);
        setInitializationStep('gps');
        return true;
      } else {
        throw new Error(healthResult.error || `Backend status: ${healthResult.status || 'unknown'}`);
      }
    } catch (error) {
      console.error(`❌ Backend health check failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < 6) { // Retry up to 6 times (30 seconds total)
        const delay = Math.min(2000 + (retryCount * 1000), 8000); // Progressive delay: 2s, 3s, 4s, 5s, 6s, 7s, 8s
        console.log(`⏳ Retrying backend health check in ${delay}ms...`);
        
        setBackendError(`Tentativo ${retryCount + 1}/6 - Riconnessione in ${Math.ceil(delay/1000)}s...`);
        
        setTimeout(() => {
          checkBackendHealth(retryCount + 1);
        }, delay);
      } else {
        console.error('💀 Backend health check failed permanently');
        setBackendError('Servizio non disponibile. Controlla la connessione internet e riprova.');
        setBackendReady(false);
        setInitializationProgress(0);
      }
      return false;
    }
  };

  // NEW: Enhanced GPS readiness check
  const checkGPSReadiness = () => {
    console.log('🎯 Checking GPS readiness...', {
      hasLocation: !!userLocation,
      accuracy: userLocation?.accuracy,
      source: userLocation?.source,
      loading: locationLoading
    });

    if (userLocation) {
      // Accept ANY location source immediately
      if (userLocation.source === 'cache') {
        console.log('✅ Using cached GPS location immediately');
        setInitializationStep('ready');
        setInitializationProgress(100);
        return true;
      } else if (userLocation.source === 'ip') {
        console.log('✅ Using IP location (network-based)');
        setInitializationStep('ready');
        setInitializationProgress(100);
        return true;
      } else if (userLocation.source === 'gps' || userLocation.source === 'gps_live') {
        console.log('✅ GPS location ready with accuracy:', userLocation.accuracy + 'm');
        setInitializationStep('ready');
        setInitializationProgress(100);
        return true;
      }
    }
    
    return false;
  };

  // NEW: Initialize app sequence
  useEffect(() => {
    console.log('🚀 Starting app initialization sequence...');
    setInitializationStep('starting');
    setInitializationProgress(5);
    
    // Small delay to show initial loading
    const timer = setTimeout(() => {
      checkBackendHealth();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (backendReady && initializationStep === 'gps') {
      console.log('🎯 Backend ready, initiating GPS location request...');
      setInitializationProgress(60);
      
      if (!locationLoading && !userLocation) {
        console.log('📍 Requesting GPS location...');
        requestLocation();
      }
    }
  }, [backendReady, initializationStep, locationLoading, userLocation, requestLocation]);


  // NEW: Monitor GPS progress and readiness
  useEffect(() => {
    if (backendReady && initializationStep === 'gps') {
      if (locationLoading) {
        setInitializationProgress(70);
      } else if (userLocation) {
        // FIXED: Accept any location immediately
        setInitializationProgress(90);
        console.log('✅ GPS location received:', userLocation.source);
        setInitializationStep('ready');
        setInitializationProgress(100);
      } else if (locationError) {
        // FIXED: Check if it's a progress error or real error
        if (locationError.isProgress) {
          console.log('🔄 GPS search in progress:', locationError.message);
          setInitializationProgress(60 + (locationError.phase * 10));
        } else if (locationError.code === 'PERMISSION_DENIED') {
          // Handle permission denied but continue
          console.log('⚠️ GPS permission denied, continuing anyway');
          setInitializationStep('ready');
          setInitializationProgress(100);
        } else {
          // Real GPS failure, but continue
          console.log('⚠️ GPS failed, continuing anyway');
          setInitializationStep('ready');
          setInitializationProgress(100);
        }
      }
    }
  }, [backendReady, userLocation, locationLoading, locationError, initializationStep]);


  // FIXED: Auto-proceed if GPS takes too long - EXTENDED TIMEOUT
  useEffect(() => {
    if (backendReady && initializationStep === 'gps') {
      const timeout = setTimeout(() => {
        if (initializationStep === 'gps') {
          console.log('⏰ GPS timeout (60s) - proceeding with available location');
          setInitializationStep('ready');
          setInitializationProgress(100);
        }
      }, 60000); // INCREASED from 15s to 60s

      return () => clearTimeout(timeout);
    }
  }, [backendReady, initializationStep]);

  // Existing useEffects with backend ready checks
  useEffect(() => {
    if (userLocation && userLocation.source === 'gps') {
      console.log('📍 Updating map center to user location:', userLocation);
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      setZoom(16);
    }
  }, [userLocation]);

  useEffect(() => {
    if (mapCenter.lat && mapCenter.lng && backendReady && initializationStep === 'ready') {
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes, backendReady, initializationStep]);

  // Check for embed mode
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === 'true';
  
  // Handle URL parameters for embedding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embedLat = urlParams.get('lat');
    const embedLng = urlParams.get('lng');
    const embedType = urlParams.get('type');
    const embedRadius = urlParams.get('radius');
    const hideControls = urlParams.get('hideControls');

    if (embedLat && embedLng) {
      setMapCenter({
        lat: parseFloat(embedLat),
        lng: parseFloat(embedLng)
      });
    }

    if (embedType && ['cafe', 'restaurant'].includes(embedType)) {
      setCafeType(embedType);
    }

    if (embedRadius) {
      setSearchRadius(parseInt(embedRadius));
    }

    if (hideControls === 'true') {
      setShowControls(false);
    }
  }, []);

  // NEW: Comprehensive loading screen logic
  // FIXED: Comprehensive loading screen logic with better GPS messages
  if (!backendReady || initializationStep !== 'ready') {
    let loadingMessage = "Inizializzazione servizio...";
    let subMessage = "Preparazione dell'esperienza di ricerca locali";
    
    switch (initializationStep) {
      case 'starting':
        loadingMessage = "Avvio applicazione...";
        subMessage = "Inizializzazione componenti";
        break;
      case 'backend':
        loadingMessage = "Connessione al servizio...";
        subMessage = backendError || "Verifica della disponibilità del backend";
        break;
      case 'gps':
        if (userLocation && userLocation.source === 'cache') {
          loadingMessage = "Posizione trovata";
          subMessage = "Usando posizione salvata mentre cerchiamo GPS fresco";
        } else if (locationError?.isProgress) {
          loadingMessage = locationError.message;
          subMessage = `Tentativo ${locationError.phase}/3 - GPS può richiedere tempo`;
        } else if (locationLoading) {
          loadingMessage = "Rilevamento posizione GPS...";
          subMessage = "Il GPS può richiedere 30-60 secondi, attendere...";
        } else if (locationError?.code === 'PERMISSION_DENIED') {
          loadingMessage = "GPS negato";
          subMessage = "Continuando con posizione di default...";
        } else if (userLocation) {
          loadingMessage = "Posizione ottenuta";
          subMessage = `Fonte: ${userLocation.source === 'ip' ? 'Network' : userLocation.source}`;
        } else {
          loadingMessage = "Finalizzazione GPS...";
          subMessage = "Ultimi controlli posizione...";
        }
        break;
      default:
        loadingMessage = "Finalizzazione...";
        subMessage = "Quasi pronto!";
    }

    return (
      <LoadingScreen 
        message={loadingMessage}
        subMessage={subMessage}
        progress={initializationProgress}
        showRetry={!!backendError && initializationStep === 'backend'}
        onRetry={() => {
          setBackendError(null);
          setInitializationProgress(5);
          checkBackendHealth();
        }}
      />
    );
  }

  // Rest of existing component logic (venue selection, etc.)
  const handleCafeSelect = (venue) => {
    setSelectedCafe(venue);
    setMapCenter({
      lat: venue.location.latitude,
      lng: venue.location.longitude
    });
    setZoom(17);
  };

  const handleMapCenterChange = (newCenter) => {
    setMapCenter(newCenter);
  };

  const handleSearchChange = (options) => {
    if (options.radius !== undefined) {
      setSearchRadius(options.radius);
    }
    if (options.type !== undefined) {
      if (['cafe', 'restaurant'].includes(options.type)) {
        setCafeType(options.type);
        setSelectedCafe(null);
      }
    }
  };

  const handleClosePopup = () => {
    setSelectedCafe(null);
  };

  const handleLocationRequest = () => {
    console.log('📍 User requested location');
    clearPermissionDenied();
    
    // FIXED: Use the new manual GPS function
    if (requestFreshGPS) {
      requestFreshGPS();
    } else {
      requestLocation();
    }
  };

  const handleContinueWithoutGPS = () => {
    console.log('📍 User chose to continue without GPS');
    clearPermissionDenied();
  };

  return (
    <div className="map-app">
      {/* Full-Page Map */}
      <FullPageMap
        center={mapCenter}
        zoom={zoom}
        cafes={cafes}
        selectedCafe={selectedCafe}
        userLocation={userLocation}
        onCafeSelect={handleCafeSelect}
        onCenterChange={handleMapCenterChange}
        onClosePopup={handleClosePopup}
        loading={cafesLoading}
        error={cafesError}
        searchRadius={searchRadius}
        cafeType={cafeType}
        showControls={showControls}
        isEmbedMode={isEmbedMode}
        onSearchChange={handleSearchChange}
        onRefresh={refetchCafes}
        onLocationRequest={handleLocationRequest}
        locationLoading={locationLoading}
        locationError={locationError}
      />

      {/* FIXED: Location Permission Modal - Show only if really needed */}
      {(locationError?.code === 'PERMISSION_DENIED' && !userLocation) && !isEmbedMode && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📍 Accesso alla Posizione</h3>
            </div>
            <div className="modal-content">
              <p>
                Per trovare i migliori caffè e ristoranti nelle vicinanze, abbiamo bisogno 
                di accedere alla tua posizione. Puoi anche continuare e cercare 
                manualmente spostando la mappa.
              </p>
              
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(79, 70, 229, 0.05)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6B7280'
              }}>
                {userLocation ? (
                  <span>✅ Posizione attuale: {userLocation.city || 'Rilevata'} 
                    ({userLocation.source === 'gps' ? 'GPS' : 
                      userLocation.source === 'gps_live' ? 'GPS Live' :
                      userLocation.source === 'cache' ? 'Cache' :
                      userLocation.source === 'ip' ? 'Network' : 'Predefinita'})
                  </span>
                ) : locationError?.isProgress ? (
                  <span>🔄 {locationError.message}</span>
                ) : (
                  <span>📍 In attesa di localizzazione...</span>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-apple-base btn-primary"
                onClick={handleLocationRequest}
                disabled={locationLoading}
              >
                {locationLoading ? 'Rilevamento...' : 'Abilita GPS'}
              </button>
              <button 
                className="btn-apple-base btn-secondary"
                onClick={handleContinueWithoutGPS}
              >
                Continua senza GPS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Status indicator */}
      {/* FIXED: Enhanced Status indicator */}
      {!isEmbedMode && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: backendReady ? 
              (userLocation?.source === 'gps' ? '#10B981' : 
               userLocation?.source === 'gps_live' ? '#00FF88' :
               userLocation?.source === 'cache' ? '#F59E0B' :
               userLocation?.source === 'ip' ? '#8B5CF6' : '#6B7280') : '#EF4444'
          }} />
          <span>
            {!backendReady ? '🔴 Servizio offline' :
            userLocation?.source === 'gps' ? '📍 GPS attivo' :
            userLocation?.source === 'gps_live' ? '🎯 GPS live' :
            userLocation?.source === 'cache' ? '💾 Posizione salvata' :
            userLocation?.source === 'ip' ? '🌐 Posizione IP' :
            '📍 Posizione predefinita'}
            {' • Caffè e Ristoranti'}
          </span>
          {userLocation?.accuracy && userLocation.accuracy < 1000 && (
            <span style={{ color: '#10B981', fontWeight: '600' }}>
              ±{Math.round(userLocation.accuracy)}m
            </span>
          )}
          {userLocation?.source === 'gps_live' && (
            <span style={{ color: '#00FF88', fontWeight: '600', animation: 'pulse 2s infinite' }}>
              LIVE
            </span>
          )}
          {userLocation?.source === 'cache' && (
            <span style={{ color: '#F59E0B', fontWeight: '600' }}>
              CACHE
            </span>
          )}
          {userLocation?.source === 'ip' && (
            <span style={{ color: '#8B5CF6', fontWeight: '600' }}>
              NET
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default App;