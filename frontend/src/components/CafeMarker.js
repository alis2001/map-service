// components/CafeMarker.js
// Location: /map-service/frontend/src/components/CafeMarker.js
// Note: This component is not actually used since we create markers directly in FullPageMap
// But included for completeness and future extensibility

import React from 'react';

const CafeMarker = ({ cafe, isSelected, onClick }) => {
  // This component is for future use if we switch to a React-based marker system
  // Currently, markers are created directly using Google Maps API in FullPageMap.js
  
  const getMarkerColor = (cafe) => {
    if (cafe.distance && cafe.distance < 300) return '#10B981'; // Very close - green
    if (cafe.distance && cafe.distance < 600) return '#F59E0B'; // Close - amber
    if (cafe.rating && cafe.rating >= 4.5) return '#8B5CF6';     // High rated - purple
    if (cafe.type === 'bar') return '#EF4444';                  // Bars - red
    return '#6366F1';                                            // Default - indigo
  };

  const markerSvg = `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40S32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="${getMarkerColor(cafe)}"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <text x="16" y="20" text-anchor="middle" font-size="12" fill="${getMarkerColor(cafe)}">${cafe.emoji || '☕'}</text>
    </svg>
  `;

  return (
    <div 
      className={`cafe-marker ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick && onClick(cafe)}
      title={cafe.name}
      style={{
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        width: '32px',
        height: '40px',
        cursor: 'pointer',
        position: 'absolute',
        transform: 'translate(-50%, -100%)',
        zIndex: isSelected ? 1000 : cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
        animation: cafe.distance && cafe.distance < 500 ? 'bounce 2s infinite' : 'none'
      }}
    >
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translate(-50%, -100%) translateY(0);
          }
          40% {
            transform: translate(-50%, -100%) translateY(-10px);
          }
          60% {
            transform: translate(-50%, -100%) translateY(-5px);
          }
        }

        .cafe-marker.selected {
          animation: pulse 1s infinite !important;
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -100%) scale(1);
          }
          50% {
            transform: translate(-50%, -100%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -100%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default CafeMarker;

// components/MapLoadingOverlay.js
// Location: /map-service/frontend/src/components/MapLoadingOverlay.js

import React from 'react';

const MapLoadingOverlay = ({ loading, mapLoaded, cafesCount }) => {
  if (!loading && mapLoaded) return null;

  const getLoadingMessage = () => {
    if (!mapLoaded) return "Inizializzazione mappa...";
    if (loading && cafesCount === 0) return "Ricerca caffè...";
    if (loading) return "Aggiornamento dati...";
    return "Caricamento...";
  };

  const getLoadingIcon = () => {
    if (!mapLoaded) return "🗺️";
    if (loading && cafesCount === 0) return "☕";
    if (loading) return "🔄";
    return "⏳";
  };

  return (
    <div className="map-loading-overlay">
      <div className="map-loading-content">
        <div className="map-loading-animation">
          <div className="loading-icon">
            {getLoadingIcon()}
          </div>
          <div className="loading-ripples">
            <div className="ripple"></div>
            <div className="ripple"></div>
            <div className="ripple"></div>
          </div>
        </div>
        
        <div className="map-loading-text">
          <h3>{getLoadingMessage()}</h3>
          <p>Un momento per favore...</p>
        </div>

        <div className="map-loading-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .map-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .map-loading-content {
          text-align: center;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          max-width: 280px;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .map-loading-animation {
          position: relative;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-icon {
          font-size: 48px;
          animation: iconFloat 2s ease-in-out infinite;
          z-index: 2;
          position: relative;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }

        .loading-ripples {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .ripple {
          position: absolute;
          border: 2px solid rgba(79, 70, 229, 0.3);
          border-radius: 50%;
          animation: rippleExpand 2s ease-out infinite;
        }

        .ripple:nth-child(1) {
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          animation-delay: 0s;
        }

        .ripple:nth-child(2) {
          width: 60px;
          height: 60px;
          margin: -30px 0 0 -30px;
          animation-delay: 0.4s;
        }

        .ripple:nth-child(3) {
          width: 80px;
          height: 80px;
          margin: -40px 0 0 -40px;
          animation-delay: 0.8s;
        }

        @keyframes rippleExpand {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .map-loading-text h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 8px;
        }

        .map-loading-text p {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 20px;
        }

        .map-loading-progress {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(79, 70, 229, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4F46E5, #7C3AED);
          border-radius: 2px;
          animation: progressMove 1.5s ease-in-out infinite;
        }

        @keyframes progressMove {
          0% {
            width: 0%;
            transform: translateX(-100%);
          }
          50% {
            width: 80%;
            transform: translateX(0%);
          }
          100% {
            width: 100%;
            transform: translateX(100%);
          }
        }

        @media (max-width: 480px) {
          .map-loading-content {
            padding: 24px 20px;
            margin: 16px;
            max-width: calc(100% - 32px);
          }

          .loading-icon {
            font-size: 40px;
          }

          .map-loading-text h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export { MapLoadingOverlay };