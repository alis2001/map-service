// components/MapUpdateLoader.js - FORCEFUL API COMPLETION VERSION
import React, { useState, useEffect } from 'react';

const MapUpdateLoader = ({ 
  loading = false, 
  searchType = 'cafe',
  forcefulMode = false // New prop for forceful API completion
}) => {
  const [ripplePhase, setRipplePhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [completionPhase, setCompletionPhase] = useState(0);

  // FORCEFUL animated progress and text updates
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setCompletionPhase(0);
      return;
    }
    
    // SLOWER progress animation for forceful completion
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (forcefulMode) {
          // Much slower progress for forceful mode
          if (prev >= 85) return 85; // Stop at 85% until actual completion
          return prev + Math.random() * 8; // Slower progress increase
        } else {
          if (prev >= 95) return 95;
          return prev + Math.random() * 15;
        }
      });
    }, forcefulMode ? 400 : 200); // Slower intervals for forceful mode
    
    // SLOWER ripple animation for forceful completion
    const rippleInterval = setInterval(() => {
      setRipplePhase(prev => (prev + 1) % 3);
    }, forcefulMode ? 1000 : 600); // Slower ripples
    
    // ENHANCED text updates for forceful completion
    const forcefulTextUpdates = [
      `🔍 Analizzando ${getTypeDisplayName(searchType)}...`,
      `🌐 Interrogando Google Places API...`,
      `📍 Verificando posizioni esatte...`,
      `⚡ Ottimizzazione risultati...`,
      `🎯 Filtraggio ${getTypeDisplayName(searchType)}...`,
      `✨ Completamento perfetto...`,
      `🚀 Finalizzazione forzata...`
    ];
    
    const normalTextUpdates = [
      `Cercando ${getTypeDisplayName(searchType)}...`,
      `Aggiornamento mappa...`,
      `Ottimizzazione marcatori...`,
      `Finalizzazione...`
    ];
    
    const textUpdates = forcefulMode ? forcefulTextUpdates : normalTextUpdates;
    
    let textIndex = 0;
    setLoadingText(textUpdates[0]);
    
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % textUpdates.length;
      setLoadingText(textUpdates[textIndex]);
    }, forcefulMode ? 1800 : 1200); // Slower text changes for forceful mode
    
    // COMPLETION PHASE TRACKING for forceful mode
    if (forcefulMode) {
      const completionInterval = setInterval(() => {
        setCompletionPhase(prev => (prev + 1) % 4);
      }, 2000);
      
      return () => {
        clearInterval(progressInterval);
        clearInterval(rippleInterval);
        clearInterval(textInterval);
        clearInterval(completionInterval);
      };
    }
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(rippleInterval);
      clearInterval(textInterval);
    };
  }, [loading, searchType, forcefulMode]);

  // Complete progress when loading finishes
  useEffect(() => {
    if (!loading && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), forcefulMode ? 800 : 300);
    }
  }, [loading, progress, forcefulMode]);

  if (!loading) return null;

  const getIcon = () => searchType === 'restaurant' ? '🍽️' : '☕';
  const getColor = () => searchType === 'restaurant' ? '#EF4444' : '#F97316';
  const getSecondaryColor = () => searchType === 'restaurant' ? '#DC2626' : '#EA580C';

  const getTypeDisplayName = (type) => {
    return type === 'restaurant' ? 'ristoranti' : 'caffetterie';
  };

  const getForcefulMessage = () => {
    if (!forcefulMode) return `Aggiornamento ${getTypeDisplayName(searchType)} in corso...`;
    
    const phases = [
      `Ricerca approfondita ${getTypeDisplayName(searchType)}`,
      `Verifica accuratezza risultati`,
      `Completamento forzato in corso`,
      `Massima precisione garantita`
    ];
    
    return phases[completionPhase];
  };

  return (
    <div className="forceful-loader-overlay">
      <div className="loader-glass-card">
        
        {/* ENHANCED Loading Animation for Forceful Mode */}
        <div className="loader-animation-container">
          <div className="ripple-container">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i}
                className={`forceful-ripple ${ripplePhase >= i ? 'active' : ''}`}
                style={{
                  '--delay': `${i * (forcefulMode ? 0.5 : 0.3)}s`,
                  '--primary-color': getColor(),
                  '--secondary-color': getSecondaryColor()
                }}
              />
            ))}
            <div className="icon-center" style={{ color: getColor() }}>
              {getIcon()}
            </div>
            
            {/* FORCEFUL MODE INDICATOR */}
            {forcefulMode && (
              <div className="forceful-indicator">
                <div className="forceful-ring">
                  <div className="forceful-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ENHANCED Progress Bar for Forceful Mode */}
        <div className="progress-container">
          <div className="progress-track">
            <div 
              className={`progress-fill ${forcefulMode ? 'forceful-progress' : ''}`}
              style={{ 
                width: `${progress}%`,
                background: forcefulMode ? 
                  `linear-gradient(90deg, ${getColor()}, ${getSecondaryColor()}, #FFD700)` :
                  `linear-gradient(90deg, ${getColor()}, ${getSecondaryColor()})`
              }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progress)}% • {forcefulMode ? 'Modalità Forzata' : 'Completato'}
          </div>
        </div>

        {/* ENHANCED Dynamic Loading Text */}
        <div className="loading-text-container">
          <h3 className="loading-title">{loadingText}</h3>
          <p className="loading-subtitle">
            {getForcefulMessage()}
          </p>
          
          {/* FORCEFUL MODE STATUS */}
          {forcefulMode && (
            <div className="forceful-status">
              <div className="status-indicator">
                <div className="status-dot pulsing"></div>
                <span>API in modalità intensiva</span>
              </div>
            </div>
          )}
        </div>

        {/* ENHANCED Animated Dots */}
        <div className="loading-dots">
          {[0, 1, 2, 3, 4].map(i => (
            <div 
              key={i}
              className={`dot ${forcefulMode ? 'forceful-dot' : ''}`}
              style={{
                '--delay': `${i * (forcefulMode ? 0.3 : 0.2)}s`,
                '--color': getColor()
              }}
            />
          ))}
        </div>

      </div>

      <style>{`
        .forceful-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, ${forcefulMode ? '0.8' : '0.7'});
          backdrop-filter: blur(${forcefulMode ? '12px' : '8px'});
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          animation: forcefulFadeIn 0.6s ease;
        }

        @keyframes forcefulFadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(${forcefulMode ? '12px' : '8px'});
          }
        }

        .loader-glass-card {
          background: rgba(255, 255, 255, ${forcefulMode ? '0.15' : '0.1'});
          backdrop-filter: blur(${forcefulMode ? '25px' : '20px'});
          border: 1px solid rgba(255, 255, 255, ${forcefulMode ? '0.3' : '0.2'});
          border-radius: 24px;
          padding: ${forcefulMode ? '40px' : '32px'};
          max-width: ${forcefulMode ? '380px' : '320px'};
          width: 90%;
          text-align: center;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: forcefulCardEntry 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes forcefulCardEntry {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .loader-animation-container {
          margin-bottom: ${forcefulMode ? '32px' : '24px'};
          position: relative;
        }

        .ripple-container {
          position: relative;
          width: ${forcefulMode ? '140px' : '120px'};
          height: ${forcefulMode ? '140px' : '120px'};
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .forceful-ripple {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid var(--primary-color);
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.5);
          animation: ${forcefulMode ? 'forcefulRippleActive' : 'beautifulRippleActive'} ${forcefulMode ? '3s' : '2.4s'} ease-out infinite;
          animation-delay: var(--delay);
        }

        .forceful-ripple.active {
          opacity: 1;
        }

        @keyframes forcefulRippleActive {
          0% {
            transform: scale(0.5);
            opacity: 1;
            border-color: var(--primary-color);
          }
          33% {
            transform: scale(2.2);
            opacity: 0.8;
            border-color: var(--secondary-color);
          }
          66% {
            transform: scale(3.5);
            opacity: 0.4;
            border-color: #FFD700;
          }
          100% {
            transform: scale(4.5);
            opacity: 0;
            border-color: var(--primary-color);
          }
        }

        .icon-center {
          font-size: ${forcefulMode ? '48px' : '40px'};
          z-index: 2;
          animation: ${forcefulMode ? 'forcefulIconFloat' : 'iconFloat'} ${forcefulMode ? '3s' : '2s'} ease-in-out infinite;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
        }

        @keyframes forcefulIconFloat {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
          }
          25% { 
            transform: scale(1.15) rotate(3deg); 
          }
          50% { 
            transform: scale(1.2) rotate(-2deg); 
          }
          75% { 
            transform: scale(1.1) rotate(2deg); 
          }
        }

        .forceful-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .forceful-ring {
          width: 100px;
          height: 100px;
          border: 2px solid rgba(255, 215, 0, 0.6);
          border-radius: 50%;
          position: relative;
          animation: forcefulRingRotate 4s linear infinite;
        }

        @keyframes forcefulRingRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .forceful-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: #FFD700;
          border-radius: 50%;
          animation: forcefulPulse 2s ease-in-out infinite;
        }

        @keyframes forcefulPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.6;
          }
        }

        .progress-container {
          margin-bottom: ${forcefulMode ? '24px' : '20px'};
        }

        .progress-track {
          width: 100%;
          height: ${forcefulMode ? '8px' : '6px'};
          background: rgba(255, 255, 255, 0.2);
          border-radius: ${forcefulMode ? '4px' : '3px'};
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          border-radius: ${forcefulMode ? '4px' : '3px'};
          transition: width 0.4s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-fill.forceful-progress::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: forcefulShimmer 1.2s linear infinite;
        }

        @keyframes forcefulShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          font-size: ${forcefulMode ? '13px' : '12px'};
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .loading-text-container {
          margin-bottom: ${forcefulMode ? '24px' : '20px'};
        }

        .loading-title {
          font-size: ${forcefulMode ? '20px' : '18px'};
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
          animation: ${forcefulMode ? 'forcefulTextPulse' : 'textPulse'} 2s ease-in-out infinite;
        }

        .loading-subtitle {
          font-size: ${forcefulMode ? '15px' : '14px'};
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 ${forcefulMode ? '16px' : '0'};
          line-height: 1.4;
        }

        @keyframes forcefulTextPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }

        .forceful-status {
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 8px 12px;
          margin-top: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: #FFD700;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #FFD700;
          border-radius: 50%;
        }

        .status-dot.pulsing {
          animation: statusPulse 1.5s ease-in-out infinite;
        }

        @keyframes statusPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.3);
            opacity: 0.7;
          }
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: ${forcefulMode ? '10px' : '8px'};
        }

        .dot {
          width: ${forcefulMode ? '10px' : '8px'};
          height: ${forcefulMode ? '10px' : '8px'};
          border-radius: 50%;
          background: var(--color);
          animation: ${forcefulMode ? 'forcefulDotBounce' : 'dotBounce'} ${forcefulMode ? '2s' : '1.4s'} ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .dot.forceful-dot {
          box-shadow: 0 0 10px var(--color);
        }

        @keyframes forcefulDotBounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          20% {
            transform: scale(1.4);
            opacity: 1;
          }
          40% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @media (max-width: 768px) {
          .loader-glass-card {
            padding: ${forcefulMode ? '32px 24px' : '24px 20px'};
            margin: 16px;
          }
          
          .ripple-container {
            width: ${forcefulMode ? '120px' : '100px'};
            height: ${forcefulMode ? '120px' : '100px'};
          }
          
          .icon-center {
            font-size: ${forcefulMode ? '40px' : '32px'};
          }
          
          .loading-title {
            font-size: ${forcefulMode ? '18px' : '16px'};
          }
        }
      `}</style>
    </div>
  );
};

export default MapUpdateLoader;