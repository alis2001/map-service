// components/MapUpdateLoader.js - LIGHTWEIGHT MAP DRAG UPDATE LOADER
// Location: /frontend/src/components/MapUpdateLoader.js

import React, { useState, useEffect } from 'react';

const MapUpdateLoader = ({ 
  loading = false, 
  venueCount = 0,
  searchType = 'cafe',
  userLocation = null
}) => {
  const [dots, setDots] = useState('');
  const [phase, setPhase] = useState(0);

  // Animated dots for searching text
  useEffect(() => {
    if (!loading) {
      setDots('');
      return;
    }
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [loading]);

  // Phase progression for search steps
  useEffect(() => {
    if (!loading) {
      setPhase(0);
      return;
    }

    const phases = [
      'Analizzando nuova area',
      'Cercando locali italiani',
      'Caricamento risultati'
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase = (currentPhase + 1) % phases.length;
      setPhase(currentPhase);
    }, 1200);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  const getSearchIcon = () => {
    switch (searchType) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      default: return '📍';
    }
  };

  const getPhaseMessage = () => {
    const messages = [
      'Analizzando nuova area',
      'Cercando locali italiani', 
      'Caricamento risultati'
    ];
    return messages[phase] || messages[0];
  };

  const getLocationText = () => {
    if (!userLocation) return '';
    return userLocation.city || userLocation.source === 'gps' ? 'GPS attivo' : 'Posizione IP';
  };

  return (
    <div className="map-update-loader">
      <div className="update-loader-container">
        {/* Main content */}
        <div className="update-content">
          <div className="update-icon-container">
            <div className="search-rings">
              <div className="search-ring ring-1"></div>
              <div className="search-ring ring-2"></div>
            </div>
            <div className="search-icon">{getSearchIcon()}</div>
          </div>
          
          <div className="update-text">
            <div className="update-message">
              {getPhaseMessage()}{dots}
            </div>
            <div className="update-details">
              {venueCount > 0 && (
                <span className="venue-count">{venueCount} locali trovati</span>
              )}
              {getLocationText() && (
                <span className="location-status">• {getLocationText()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Animated progress wave */}
        <div className="progress-wave">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
      </div>

      <style>{`
        .map-update-loader {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          pointer-events: none;
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .update-loader-container {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 16px 24px;
          min-width: 300px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }

        .update-content {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .update-icon-container {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-rings {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .search-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(0, 122, 255, 0.3);
          animation: ringPulse 2s ease-in-out infinite;
        }

        .ring-1 {
          width: 40px;
          height: 40px;
          animation-delay: 0s;
        }

        .ring-2 {
          width: 30px;
          height: 30px;
          top: 5px;
          left: 5px;
          animation-delay: 0.5s;
          border-color: rgba(88, 86, 214, 0.4);
        }

        @keyframes ringPulse {
          0%, 100% { 
            transform: scale(0.8);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        .search-icon {
          font-size: 20px;
          z-index: 3;
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(2deg); }
        }

        .update-text {
          flex: 1;
          color: white;
        }

        .update-message {
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .update-details {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .venue-count {
          color: #00FF88;
          font-weight: 600;
        }

        .location-status {
          color: #007AFF;
          font-weight: 500;
        }

        .progress-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          overflow: hidden;
          border-radius: 0 0 20px 20px;
        }

        .wave {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(0, 122, 255, 0.8), 
            rgba(88, 86, 214, 0.6),
            rgba(175, 82, 222, 0.4),
            transparent
          );
          animation: waveMove 2s linear infinite;
        }

        .wave-1 {
          animation-delay: 0s;
        }

        .wave-2 {
          animation-delay: 0.7s;
          opacity: 0.7;
        }

        .wave-3 {
          animation-delay: 1.4s;
          opacity: 0.5;
        }

        @keyframes waveMove {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .map-update-loader {
            left: 16px;
            right: 16px;
            transform: none;
          }

          .update-loader-container {
            min-width: 0;
            padding: 14px 20px;
          }

          .update-content {
            gap: 12px;
          }

          .update-icon-container {
            width: 36px;
            height: 36px;
          }

          .ring-1 {
            width: 36px;
            height: 36px;
          }

          .ring-2 {
            width: 26px;
            height: 26px;
            top: 5px;
            left: 5px;
          }

          .search-icon {
            font-size: 18px;
          }

          .update-message {
            font-size: 13px;
          }

          .update-details {
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .update-content {
            flex-direction: column;
            text-align: center;
            gap: 8px;
          }

          .update-details {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default MapUpdateLoader;