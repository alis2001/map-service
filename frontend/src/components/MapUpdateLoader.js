// components/MapUpdateLoader.js - BEAUTIFUL OPTIMIZED VERSION
import React, { useState, useEffect } from 'react';

const MapUpdateLoader = ({ 
  loading = false, 
  searchType = 'cafe'
}) => {
  const [ripplePhase, setRipplePhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // Animated progress and text updates
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95; // Stop at 95% until actual completion
        return prev + Math.random() * 15; // Smooth progress increase
      });
    }, 200);
    
    // Ripple animation
    const rippleInterval = setInterval(() => {
      setRipplePhase(prev => (prev + 1) % 3);
    }, 600);
    
    // Dynamic text updates
    const textUpdates = [
      `Cercando ${getTypeDisplayName(searchType)}...`,
      `Aggiornamento mappa...`,
      `Ottimizzazione marcatori...`,
      `Finalizzazione...`
    ];
    
    let textIndex = 0;
    setLoadingText(textUpdates[0]);
    
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % textUpdates.length;
      setLoadingText(textUpdates[textIndex]);
    }, 1200);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(rippleInterval);
      clearInterval(textInterval);
    };
  }, [loading, searchType]);

  // Complete progress when loading finishes
  useEffect(() => {
    if (!loading && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 300);
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
    <div className="beautiful-loader-overlay">
      <div className="loader-glass-card">
        
        {/* Main Loading Animation */}
        <div className="loader-animation-container">
          <div className="ripple-container">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`beautiful-ripple ${ripplePhase >= i ? 'active' : ''}`}
                style={{
                  '--delay': `${i * 0.3}s`,
                  '--primary-color': getColor(),
                  '--secondary-color': getSecondaryColor()
                }}
              />
            ))}
            <div className="icon-center" style={{ color: getColor() }}>
              {getIcon()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${getColor()}, ${getSecondaryColor()})`
              }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progress)}% completato
          </div>
        </div>

        {/* Dynamic Loading Text */}
        <div className="loading-text-container">
          <h3 className="loading-title">{loadingText}</h3>
          <p className="loading-subtitle">
            Aggiornamento {getTypeDisplayName(searchType)} in corso...
          </p>
        </div>

        {/* Animated Dots */}
        <div className="loading-dots">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i}
              className="dot"
              style={{
                '--delay': `${i * 0.2}s`,
                '--color': getColor()
              }}
            />
          ))}
        </div>

      </div>

      <style>{`
        .beautiful-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          animation: smoothFadeIn 0.4s ease;
        }

        @keyframes smoothFadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(8px);
          }
        }

        .loader-glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 32px;
          max-width: 320px;
          width: 90%;
          text-align: center;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: glassCardEntry 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes glassCardEntry {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .loader-animation-container {
          margin-bottom: 24px;
        }

        .ripple-container {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .beautiful-ripple {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid var(--primary-color);
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.5);
          animation: beautifulRipple 2.4s ease-out infinite;
          animation-delay: var(--delay);
        }

        .beautiful-ripple.active {
          opacity: 1;
          animation: beautifulRippleActive 2.4s ease-out infinite;
          animation-delay: var(--delay);
        }

        @keyframes beautifulRippleActive {
          0% {
            transform: scale(0.5);
            opacity: 1;
            border-color: var(--primary-color);
          }
          50% {
            transform: scale(2);
            opacity: 0.6;
            border-color: var(--secondary-color);
          }
          100% {
            transform: scale(3.5);
            opacity: 0;
            border-color: var(--primary-color);
          }
        }

        .icon-center {
          font-size: 40px;
          z-index: 2;
          animation: iconFloat 2s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        @keyframes iconFloat {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            transform: scale(1.1) rotate(5deg); 
          }
        }

        .progress-container {
          margin-bottom: 20px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 1.5s linear infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
        }

        .loading-text-container {
          margin-bottom: 20px;
        }

        .loading-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
          animation: textPulse 2s ease-in-out infinite;
        }

        .loading-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        @keyframes textPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color);
          animation: dotBounce 1.4s ease-in-out infinite;
          animation-delay: var(--delay);
        }

        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .loader-glass-card {
            padding: 24px 20px;
            margin: 16px;
          }
          
          .ripple-container {
            width: 100px;
            height: 100px;
          }
          
          .icon-center {
            font-size: 32px;
          }
          
          .loading-title {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapUpdateLoader;