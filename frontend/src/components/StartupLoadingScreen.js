// components/StartupLoadingScreen.js
// Location: /frontend/src/components/StartupLoadingScreen.js

import React, { useState, useEffect } from 'react';

const StartupLoadingScreen = ({ 
  stage = 'initializing', // 'initializing', 'location', 'map', 'ready'
  progress = 0,
  message = "Avvio applicazione...",
  subMessage = "",
  locationQuality = null,
  onLocationRetry = null
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [showRetry, setShowRetry] = useState(false);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Phase animation for different stages
  useEffect(() => {
    const phases = ['🚀', '📍', '🗺️', '⚡'];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setCurrentPhase(currentIndex);
      currentIndex = (currentIndex + 1) % phases.length;
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Pulse animation intensity based on progress
  useEffect(() => {
    const intensity = Math.max(0.5, (100 - progress) / 100);
    setPulseIntensity(intensity);
  }, [progress]);

  // Show retry after 10 seconds if stuck on location
  useEffect(() => {
    if (stage === 'location') {
      const timer = setTimeout(() => {
        setShowRetry(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [stage]);

  const getStageIcon = () => {
    switch (stage) {
      case 'initializing': return '🚀';
      case 'location': return '📍';
      case 'map': return '🗺️';
      case 'ready': return '⚡';
      default: return '🌟';
    }
  };

  const getStageColor = () => {
    switch (stage) {
      case 'initializing': return '#667eea';
      case 'location': return '#f093fb';
      case 'map': return '#4facfe';
      case 'ready': return '#43e97b';
      default: return '#667eea';
    }
  };

  const getGradient = () => {
    switch (stage) {
      case 'initializing': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'location': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'map': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'ready': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  return (
    <div className="startup-loading-screen">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="floating-circles">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className="floating-circle"
              style={{
                '--delay': `${i * 0.5}s`,
                '--size': `${60 + i * 20}px`,
                '--opacity': 0.1 - i * 0.015
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="startup-content">
        
        {/* Creative Icon Animation */}
        <div className="icon-container">
          <div className="main-icon" style={{ background: getGradient() }}>
            <span className="icon-emoji">{getStageIcon()}</span>
            <div className="icon-pulse" style={{ '--pulse-intensity': pulseIntensity }} />
            <div className="icon-rings">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className="pulse-ring"
                  style={{ 
                    '--delay': `${i * 0.4}s`,
                    borderColor: getStageColor()
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-container">
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${animatedProgress}%`,
                  background: getGradient()
                }}
              >
                <div className="progress-shine" />
              </div>
            </div>
            <div className="progress-text">
              {Math.round(animatedProgress)}% • {stage === 'ready' ? 'Completato!' : 'Caricamento...'}
            </div>
          </div>

          {/* Stage Indicators */}
          <div className="stage-indicators">
            {['🚀', '📍', '🗺️', '⚡'].map((emoji, index) => (
              <div 
                key={index}
                className={`stage-indicator ${
                  ['initializing', 'location', 'map', 'ready'][index] === stage ? 'active' : ''
                } ${
                  ['initializing', 'location', 'map', 'ready'].indexOf(stage) > index ? 'completed' : ''
                }`}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Text Content */}
        <div className="text-content">
          <h2 className="main-message">{message}</h2>
          {subMessage && <p className="sub-message">{subMessage}</p>}
          {locationQuality && (
            <div className="quality-badge">
              {locationQuality}
            </div>
          )}
        </div>

        {/* Retry Button for Location Issues */}
        {showRetry && stage === 'location' && onLocationRetry && (
          <div className="retry-section">
            <button 
              className="retry-button"
              onClick={onLocationRetry}
            >
              📍 Riprova Posizione
            </button>
            <p className="retry-hint">
              Assicurati di aver consentito l'accesso alla posizione
            </p>
          </div>
        )}

        {/* Loading Dots Animation */}
        <div className="loading-dots">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="dot"
              style={{ 
                '--delay': `${i * 0.2}s`,
                backgroundColor: getStageColor()
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .startup-loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        .animated-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        }

        .floating-circles {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .floating-circle {
          position: absolute;
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(102, 126, 234, var(--opacity)) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite var(--delay);
          top: 20%;
          left: 10%;
        }

        .floating-circle:nth-child(2) { top: 60%; left: 80%; }
        .floating-circle:nth-child(3) { top: 30%; left: 70%; }
        .floating-circle:nth-child(4) { top: 80%; left: 20%; }
        .floating-circle:nth-child(5) { top: 10%; left: 50%; }
        .floating-circle:nth-child(6) { top: 70%; left: 40%; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: var(--opacity); }
          33% { transform: translateY(-30px) scale(1.1); opacity: calc(var(--opacity) * 1.5); }
          66% { transform: translateY(15px) scale(0.9); opacity: calc(var(--opacity) * 0.8); }
        }

        .startup-content {
          text-align: center;
          max-width: 400px;
          width: 90%;
          z-index: 2;
          position: relative;
        }

        .icon-container {
          margin-bottom: 32px;
          position: relative;
          display: flex;
          justify-content: center;
        }

        .main-icon {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        .icon-emoji {
          font-size: 48px;
          z-index: 3;
          position: relative;
          animation: iconBounce 2s ease-in-out infinite;
        }

        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .icon-pulse {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          animation: pulse calc(var(--pulse-intensity) * 2s) ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
        }

        .icon-rings {
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
        }

        .pulse-ring {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 2px solid;
          border-radius: 50%;
          animation: ringPulse 3s ease-in-out infinite var(--delay);
          opacity: 0;
        }

        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .progress-section {
          margin-bottom: 32px;
        }

        .progress-container {
          margin-bottom: 20px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          animation: shine 2s infinite;
        }

        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .progress-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .stage-indicators {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .stage-indicator {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .stage-indicator.active {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        .stage-indicator.completed {
          background: rgba(67, 233, 123, 0.3);
          border-color: rgba(67, 233, 123, 0.6);
        }

        .text-content {
          margin-bottom: 24px;
        }

        .main-message {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
          margin-top: 0;
        }

        .sub-message {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.4;
        }

        .quality-badge {
          display: inline-block;
          background: rgba(67, 233, 123, 0.2);
          color: #43e97b;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 12px;
          border: 1px solid rgba(67, 233, 123, 0.3);
        }

        .retry-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .retry-button {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);
        }

        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(240, 147, 251, 0.4);
        }

        .retry-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 8px;
          margin-bottom: 0;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: dotPulse 1.5s ease-in-out infinite var(--delay);
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* Mobile Optimization */
        @media (max-width: 480px) {
          .startup-content {
            max-width: 350px;
            padding: 20px;
          }

          .main-icon {
            width: 100px;
            height: 100px;
          }

          .icon-emoji {
            font-size: 40px;
          }

          .main-message {
            font-size: 20px;
          }

          .sub-message {
            font-size: 14px;
          }

          .stage-indicator {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default StartupLoadingScreen;