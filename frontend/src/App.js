// App.js - ENHANCED VERSION with Optimized Dual Location Detection
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
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
  // Enhanced initialization states
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [initializationStep, setInitializationStep] = useState('starting');
  const [initializationProgress, setInitializationProgress] = useState(0);
  const [appReady, setAppReady] = useState(false);
  
  // App state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LAT) || 45.0703,
    lng: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LNG) || 7.6869
  });
  const [zoom, setZoom] = useState(parseInt(process.env.REACT_APP_DEFAULT_ZOOM) || 15);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);

  // Enhanced geolocation hook with dual detection
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    detectionMethod,
    detectionPhase,
    locationCapability,
    hasLocation,
    isHighAccuracy,
    qualityText,
    sourceText,
    isDetecting,
    requestLocation,
    requestFreshGPS,
    clearPermissionDenied,
    debugInfo
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // 🏥 **ENHANCED BACKEND HEALTH CHECK**
  const checkBackendHealth = useCallback(async (retryCount = 0) => {
    try {
      console.log(`🔍 Backend health check (attempt ${retryCount + 1})...`);
      setInitializationStep('backend');
      setInitializationProgress(20 + (retryCount * 10));
      
      const healthResult = await healthAPI.checkHealth();
      console.log('🏥 Backend health result:', healthResult);
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy' || healthResult.status === 'DEGRADED')) {
        console.log('✅ Backend is ready');
        setBackendReady(true);
        setBackendError(null);
        setInitializationProgress(50);
        return true;
      } else {
        throw new Error(healthResult.error || `Backend status: ${healthResult.status || 'unknown'}`);
      }
    } catch (error) {
      console.error(`❌ Backend health check failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < 6) {
        const delay = Math.min(2000 + (retryCount * 1000), 8000);
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
  }, []);

  // 🎯 **ENHANCED LOCATION READINESS CHECK**
  const checkLocationReadiness = useCallback(() => {
    console.log('🎯 Checking location readiness...', {
      hasLocation,
      detectionPhase,
      detectionMethod,
      quality: qualityText,
      source: sourceText
    });

    // Accept any successful location detection
    if (hasLocation && detectionPhase === 'completed') {
      console.log('✅ Location ready:', {
        method: detectionMethod,
        quality: qualityText,
        accuracy: userLocation?.accuracy ? Math.round(userLocation.accuracy) + 'm' : 'unknown'
      });
      return true;
    }

    // Still detecting
    if (isDetecting) {
      console.log('🔄 Location detection in progress...');
      return false;
    }

    // Detection failed but we can continue
    if (detectionPhase === 'completed' && !hasLocation) {
      console.log('⚠️ Location detection failed, but continuing...');
      return true; // Allow app to continue without location
    }

    return false;
  }, [hasLocation, detectionPhase, detectionMethod, qualityText, sourceText, isDetecting, userLocation]);

  // 🚀 **ENHANCED INITIALIZATION SEQUENCE**
  useEffect(() => {
    console.log('🚀 Starting enhanced app initialization...');
    setInitializationStep('starting');
    setInitializationProgress(5);
    
    const timer = setTimeout(() => {
      checkBackendHealth();
    }, 500);

    return () => clearTimeout(timer);
  }, [checkBackendHealth]);

  // 📍 **LOCATION DETECTION MONITORING**
  useEffect(() => {
    if (backendReady) {
      setInitializationStep('location');
      setInitializationProgress(60);

      // Monitor location detection progress
      if (isDetecting) {
        setInitializationProgress(70);
      } else if (hasLocation) {
        setInitializationProgress(90);
        setInitializationStep('ready');
        setTimeout(() => {
          setAppReady(true);
          setInitializationProgress(100);
        }, 500);
      } else if (detectionPhase === 'completed') {
        // Location detection completed (with or without success)
        setInitializationProgress(85);
        setInitializationStep('ready');
        setTimeout(() => {
          setAppReady(true);
          setInitializationProgress(100);
        }, 1000);
      }
    }
  }, [backendReady, isDetecting, hasLocation, detectionPhase]);

  // 🗺️ **AUTO-PROCEED TIMEOUT** 
  useEffect(() => {
    if (backendReady && initializationStep === 'location') {
      const timeout = setTimeout(() => {
        if (!appReady) {
          console.log('⏰ Location timeout (30s) - proceeding with available data');
          setAppReady(true);
          setInitializationProgress(100);
          setInitializationStep('ready');
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [backendReady, initializationStep, appReady]);

  // 🗺️ **MAP CENTER UPDATES**
  useEffect(() => {
    if (userLocation && (userLocation.source === 'gps' || userLocation.source === 'gps_live')) {
      console.log('📍 Updating map center to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6),
        source: userLocation.source,
        quality: qualityText
      });
      
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Zoom based on accuracy
      if (isHighAccuracy) {
        setZoom(17); // High accuracy - zoom in more
      } else {
        setZoom(16); // Good accuracy - standard zoom
      }
    }
  }, [userLocation, qualityText, isHighAccuracy]);

  // 🔄 **CAFE DATA REFRESH**
  useEffect(() => {
    if (mapCenter.lat && mapCenter.lng && backendReady && appReady) {
      console.log('🔄 Refreshing cafe data for new location');
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes, backendReady, appReady]);

  // 🎛️ **URL PARAMETERS HANDLING**
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

  // 📱 **DETECT EMBED MODE**
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === 'true';

  // 🎬 **LOADING SCREEN LOGIC**
  if (!appReady) {
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
      case 'location':
        if (isDetecting) {
          loadingMessage = "Rilevamento posizione...";
          subMessage = `Metodo: ${sourceText} • Qualità: ${qualityText}`;
        } else if (hasLocation) {
          loadingMessage = "Posizione rilevata";
          subMessage = `${sourceText} • Precisione: ${userLocation?.accuracy ? Math.round(userLocation.accuracy) + 'm' : 'Buona'}`;
        } else {
          loadingMessage = "Finalizzazione posizione...";
          subMessage = "Completamento rilevamento...";
        }
        break;
      case 'ready':
        loadingMessage = "Quasi pronto!";
        subMessage = "Inizializzazione mappa...";
        break;
      default:
        loadingMessage = "Caricamento...";
        subMessage = "Un momento per favore...";
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

  // 🎯 **EVENT HANDLERS**
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
    console.log('📍 User requested location update');
    clearPermissionDenied();
    requestLocation();
  };

  const handleFreshGPSRequest = () => {
    console.log('🎯 User requested fresh GPS');
    requestFreshGPS();
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
        onFreshGPSRequest={handleFreshGPSRequest}
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod}
        locationCapability={locationCapability}
      />

      {/* Enhanced Location Permission Modal */}
      {(locationError?.code === 'PERMISSION_DENIED' && !hasLocation) && !isEmbedMode && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📍 Accesso alla Posizione</h3>
            </div>
            <div className="modal-content">
              <p>
                Per trovare i migliori caffè e ristoranti nelle vicinanze, abbiamo bisogno 
                di accedere alla tua posizione. Il sistema proverà automaticamente diversi 
                metodi di rilevamento per offrirti la migliore esperienza.
              </p>
              
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(79, 70, 229, 0.05)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6B7280'
              }}>
                {hasLocation ? (
                  <span>✅ Posizione: {sourceText} 
                    ({qualityText} - {userLocation?.accuracy ? Math.round(userLocation.accuracy) + 'm' : 'N/A'})
                  </span>
                ) : isDetecting ? (
                  <span>🔄 Rilevamento in corso: {detectionMethod}</span>
                ) : (
                  <span>📍 Metodi disponibili: GPS, Browser, Cache</span>
                )}
              </div>

              {/* Detection Capability Info */}
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#9CA3AF'
              }}>
                Dispositivo: {locationCapability === 'excellent' ? '📱 Mobile (GPS)' :
                           locationCapability === 'good' ? '📱 Mobile (Network)' :
                           locationCapability === 'acceptable' ? '💻 Desktop (WiFi)' : '❓ Limitato'}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-apple-base btn-primary"
                onClick={handleLocationRequest}
                disabled={isDetecting}
              >
                {isDetecting ? 'Rilevamento...' : 'Abilita Posizione'}
              </button>
              {hasLocation && (
                <button 
                  className="btn-apple-base btn-secondary"
                  onClick={handleFreshGPSRequest}
                  disabled={isDetecting}
                >
                  🎯 GPS Fresco
                </button>
              )}
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

      {/* Enhanced Status Indicator */}
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
            background: 
              !backendReady ? '#EF4444' :
              hasLocation && userLocation?.source === 'gps' ? '#10B981' :
              hasLocation && userLocation?.source === 'gps_live' ? '#00FF88' :
              hasLocation && userLocation?.source === 'browser' ? '#8B5CF6' :
              hasLocation && userLocation?.source === 'cache' ? '#F59E0B' : '#6B7280'
          }} />
          <span>
            {!backendReady ? '🔴 Servizio offline' :
            hasLocation && userLocation?.source === 'gps' ? '📍 GPS attivo' :
            hasLocation && userLocation?.source === 'gps_live' ? '🎯 GPS live' :
            hasLocation && userLocation?.source === 'browser' ? '🌐 Browser' :
            hasLocation && userLocation?.source === 'cache' ? '💾 Cache' :
            isDetecting ? '🔄 Rilevando...' :
            '📍 Posizione predefinita'}
            {' • '}
            {qualityText === 'excellent' ? '🎯 Ottima' :
             qualityText === 'good' ? '👍 Buona' :
             qualityText === 'acceptable' ? '✅ Accettabile' :
             qualityText === 'poor' ? '⚠️ Limitata' : 'Standard'}
          </span>
          {userLocation?.accuracy && userLocation.accuracy < 100 && (
            <span style={{ color: '#10B981', fontWeight: '600' }}>
              ±{Math.round(userLocation.accuracy)}m
            </span>
          )}
          {isDetecting && (
            <span style={{ 
              color: '#3B82F6', 
              fontWeight: '600',
              animation: 'pulse 1s infinite'
            }}>
              LIVE
            </span>
          )}
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 1001,
          maxWidth: '200px'
        }}>
          <div>Phase: {detectionPhase}</div>
          <div>Method: {detectionMethod}</div>
          <div>Capability: {locationCapability}</div>
          <div>Source: {sourceText}</div>
          <div>Quality: {qualityText}</div>
          {userLocation && (
            <>
              <div>Lat: {userLocation.latitude.toFixed(6)}</div>
              <div>Lng: {userLocation.longitude.toFixed(6)}</div>
              <div>Acc: {Math.round(userLocation.accuracy || 0)}m</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;