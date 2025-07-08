// index.js - React Entry Point
// Location: /map-service/frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css';

// Performance monitoring (optional)
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Log environment info in development
if (process.env.NODE_ENV === 'development') {
  console.log('🗺️ CoffeeFinder Map Service Starting...');
  console.log('📊 Environment Info:', {
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'SET' : 'MISSING',
    DEFAULT_LOCATION: {
      lat: process.env.REACT_APP_DEFAULT_LOCATION_LAT,
      lng: process.env.REACT_APP_DEFAULT_LOCATION_LNG
    },
    GEOLOCATION_ENABLED: process.env.REACT_APP_ENABLE_GEOLOCATION,
    DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE
  });
}

// Check for required environment variables
const requiredEnvVars = {
  'REACT_APP_API_BASE_URL': process.env.REACT_APP_API_BASE_URL,
  'REACT_APP_GOOGLE_MAPS_API_KEY': process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  'REACT_APP_DEFAULT_LOCATION_LAT': process.env.REACT_APP_DEFAULT_LOCATION_LAT,
  'REACT_APP_DEFAULT_LOCATION_LNG': process.env.REACT_APP_DEFAULT_LOCATION_LNG
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('📋 Please check your .env file and ensure all required variables are set');
}

// Create root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Error boundary for the entire app
const AppWithErrorHandling = () => {
  React.useEffect(() => {
    // Handle global errors
    const handleError = (error) => {
      console.error('🚨 Global error caught:', error);
      
      // Report to error tracking service if available
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.toString(),
          fatal: false
        });
      }
    };

    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      
      // Report to error tracking service if available
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: event.reason.toString(),
          fatal: false
        });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <App />;
};

// Render app
root.render(
  <React.StrictMode>
    <AppWithErrorHandling />
  </React.StrictMode>
);

// Performance monitoring
function sendToAnalytics(metric) {
  // Send to analytics service (Google Analytics, etc.)
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital:', metric);
  }
}

// Track Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Service Worker registration (optional - for PWA features)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((registrationError) => {
        console.warn('⚠️ SW registration failed:', registrationError);
      });
  });
}

// Hot module replacement for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('🔄 Hot reloading App component...');
  });
}

// Expose app info to global scope for debugging
if (process.env.NODE_ENV === 'development') {
  window.CoffeeFinderMap = {
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    apiUrl: process.env.REACT_APP_API_BASE_URL,
    debugMode: process.env.REACT_APP_DEBUG_MODE === 'true',
    
    // Debug utilities
    checkHealth: async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/health`);
        const data = await response.json();
        console.log('🔍 Backend Health:', data);
        return data;
      } catch (error) {
        console.error('❌ Backend Health Check Failed:', error);
        return null;
      }
    },
    
    testNearbyPlaces: async (lat = 45.0703, lng = 7.6869) => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/v1/places/nearby?latitude=${lat}&longitude=${lng}&type=cafe&limit=5`
        );
        const data = await response.json();
        console.log('🔍 Nearby Places Test:', data);
        return data;
      } catch (error) {
        console.error('❌ Nearby Places Test Failed:', error);
        return null;
      }
    },
    
    clearCache: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🗑️ Local storage cleared');
    },
    
    getLocation: () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            console.log('📍 Current Location:', location);
            resolve(location);
          },
          (error) => {
            console.error('❌ Geolocation Error:', error);
            reject(error);
          }
        );
      });
    }
  };
  
  console.log('🛠️ Debug utilities available at window.CoffeeFinderMap');
}