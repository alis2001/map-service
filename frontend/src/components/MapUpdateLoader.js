// components/MapUpdateLoader.js - INSTANT VERSION for Ultra-Fast Updates
import React, { useState, useEffect } from 'react';

const MapUpdateLoader = ({ 
  loading = false, 
  searchType = 'cafe',
  forcefulMode = false // Disable for instant feel
}) => {
  const [ripplePhase, setRipplePhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // INSTANT animated progress and text updates
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }
    
    // INSTANT progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90; // Stay at 90% until completion
        return prev + Math.random() * 20; // Fast progress increase
      });
    }, 150); // Fast intervals
    
    // INSTANT ripple animation
    const rippleInterval = setInterval(() => {
      setRipplePhase(prev => (prev + 1) % 3);
    }, 400); // Fast ripples
    
    // INSTANT text updates
    const instantTextUpdates = [
      `🔍 Aggiornamento ${getTypeDisplayName(searchType)}...`,
      `⚡ Nuovi risultati...`,
      `🎯 Finalizzazione...`
    ];
    
    let textIndex = 0;
    setLoadingText(instantTextUpdates[0]);
    
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % instantTextUpdates.length;
      setLoadingText(instantTextUpdates[textIndex]);
    }, 600); // Fast text changes
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(rippleInterval);
      clearInterval(textInterval);
    };
  }, [loading, searchType]);

  // Complete progress instantly when loading finishes
  useEffect(() => {
    if (!loading && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 200); // Very fast completion
    }
  }, [loading, progress]);

  if (!loading) return null;

  const getIcon = () => searchType === 'restaurant' ? '🍽️' : '☕';
  const getColor = () => searchType === 'restaurant' ? '#EF4444' : '#F97316';
  const getSecondaryColor = () => searchType === 'restaurant' ? '#DC2626' : '#EA580C';

  const getTypeDisplayName = (type) => {
    return type === 'restaurant' ? 'ristoranti' : 'caffetterie';
  };

  return (
    <div className="instant-loader-overlay">
      <div className="loader-compact-card">
        
        {/* COMPACT Loading Animation */}
        <div className="loader-animation-compact">
          <div className="ripple-container-compact">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`instant-ripple ${ripplePhase >= i ? 'active' : ''}`}
                style={{
                  '--delay': `${i * 0.2}s`,
                  '--primary-color': getColor(),
                  '--secondary-color': getSecondaryColor()
                }}
              />
            ))}
            <div className="icon-center-compact" style={{ color: getColor() }}>
              {getIcon()}
            </div>
          </div>
        </div>

        {/* COMPACT Progress Bar */}
        <div className="progress-container-compact">
          <div className="progress-track-compact">
            <div 
              className="progress-fill-compact"
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${getColor()}, ${getSecondaryColor()})`
              }}
            />
          </div>
        </div>

        {/* COMPACT Loading Text */}
        <div className="loading-text-compact">
          <span className="loading-title-compact">{loadingText}</span>
        </div>

      </div>

      <style>{`
        .instant-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          animation: instantFadeIn 0.2s ease;
        }

        @keyframes instantFadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(4px);
          }
        }

        .loader-compact-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 20px;
          max-width: 200px;
          width: 90%;
          text-align: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          animation: instantCardEntry 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes instantCardEntry {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .loader-animation-compact {
          margin-bottom: 16px;
          position: relative;
        }

        .ripple-container-compact {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .instant-ripple {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid var(--primary-color);
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.5);
          animation: instantRippleActive 1.5s ease-out infinite;
          animation-delay: var(--delay);
        }

        .instant-ripple.active {
          opacity: 1;
        }

        @keyframes instantRippleActive {
          0% {
            transform: scale(0.5);
            opacity: 1;
            border-color: var(--primary-color);
          }
          50% {
            transform: scale(1.8);
            opacity: 0.6;
            border-color: var(--secondary-color);
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
            border-color: var(--primary-color);
          }
        }

        .icon-center-compact {
          font-size: 24px;
          z-index: 2;
          animation: instantIconFloat 1.5s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        @keyframes instantIconFloat {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            transform: scale(1.1) rotate(2deg); 
          }
        }

        .progress-container-compact {
          margin-bottom: 12px;
        }

        .progress-track-compact {
          width: 100%;
          height: 4px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill-compact {
          height: 100%;
          border-radius: 2px;
          transition: width 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-fill-compact::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: instantShimmer 0.8s linear infinite;
        }

        @keyframes instantShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .loading-text-compact {
          text-align: center;
        }

        .loading-title-compact {
          font-size: 14px;
          font-weight: 600;
          color: #1F2937;
          animation: instantTextPulse 1.5s ease-in-out infinite;
        }

        @keyframes instantTextPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 768px) {
          .loader-compact-card {
            padding: 16px;
            max-width: 180px;
          }
          
          .ripple-container-compact {
            width: 50px;
            height: 50px;
          }
          
          .icon-center-compact {
            font-size: 20px;
          }
          
          .loading-title-compact {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapUpdateLoader;