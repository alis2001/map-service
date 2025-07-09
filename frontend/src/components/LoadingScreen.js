// components/LoadingScreen.js - Italian Coffee Theme
// Location: /map-service/frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Inizializzazione mappa caffè...", 
  subMessage = "Preparazione servizio locali italiani" 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    "🗺️ Inizializzazione mappa italiana...",
    "📍 Rilevamento posizione GPS...",
    "☕ Ricerca caffè e bar nelle vicinanze...",
    "🍽️ Caricamento ristoranti selezionati...",
    "⚡ Attivazione localizzazione precisa...",
    "✨ Preparazione interfaccia italiana..."
  ];

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="loading-screen">
      <div className="loading-background" />
      
      <div className="loading-content">
        {/* Main Loading Animation - Italian Coffee Theme */}
        <div className="loading-animation">
          <div className="coffee-steam-container">
            <div className="coffee-cup">
              ☕
            </div>
            <div className="steam">
              <div className="steam-line"></div>
              <div className="steam-line"></div>
              <div className="steam-line"></div>
            </div>
          </div>
          
          {/* Lightning bolt for GPS */}
          <div className="lightning-indicator">
            ⚡
          </div>
        </div>

        {/* Progress Ring with Italian Colors */}
        <div className="progress-ring">
          <svg className="progress-svg" viewBox="0 0 120 120">
            <circle
              className="progress-bg"
              cx="60"
              cy="60"
              r="54"
            />
            <circle
              className="progress-fill"
              cx="60"
              cy="60"
              r="54"
              style={{
                strokeDasharray: `${2 * Math.PI * 54}`,
                strokeDashoffset: `${2 * Math.PI * 54 * (1 - progress / 100)}`
              }}
            />
          </svg>
          <div className="progress-text">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Loading Text */}
        <div className="loading-text">
          <h2 className="main-message">{message}</h2>
          <p className="sub-message">{subMessage}</p>
          <p className="dynamic-message">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        {/* Italian Loading Dots */}
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>

        {/* Brand Info with Italian Theme */}
        <div className="brand-info">
          <div className="brand-logo">
            <div className="logo-coffee">☕</div>
            <div className="logo-lightning">⚡</div>
          </div>
          <div className="brand-text">
            <strong>CoffeeFinder Map</strong>
            <span>Scopri i migliori locali italiani nelle vicinanze</span>
            <div className="features">
              <span>🇮🇹 Solo locali selezionati</span>
              <span>📍 GPS preciso</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .loading-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(111, 78, 55, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(222, 184, 135, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(206, 43, 55, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #F5F5DC 0%, #FFFFFF 100%);
          background-size: 100% 100%;
          animation: backgroundFloat 8s ease-in-out infinite;
        }

        @keyframes backgroundFloat {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(2deg); }
        }

        .loading-content {
          text-align: center;
          position: relative;
          z-index: 10;
          background: linear-gradient(135deg, rgba(245, 245, 220, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(20px);
          padding: 48px 32px;
          border-radius: 32px;
          box-shadow: 
            0 20px 40px rgba(111, 78, 55, 0.15),
            0 0 0 2px rgba(222, 184, 135, 0.3);
          border: 2px solid rgba(222, 184, 135, 0.4);
          max-width: 420px;
          width: 90%;
          animation: contentFloat 3s ease-in-out infinite;
          position: relative;
        }

        /* Italian flag accent */
        .loading-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #009246 0%, #FFFFFF 50%, #CE2B37 100%);
          border-radius: 32px 32px 0 0;
          z-index: 1;
        }

        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .loading-animation {
          position: relative;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .coffee-steam-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coffee-cup {
          font-size: 64px;
          animation: coffeeWiggle 2s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(111, 78, 55, 0.3));
        }

        @keyframes coffeeWiggle {
          0%, 100% { transform: rotate(-3deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.1); }
        }

        .steam {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
        }

        .steam-line {
          width: 2px;
          height: 20px;
          background: linear-gradient(to top, rgba(111, 78, 55, 0.6), transparent);
          border-radius: 1px;
          animation: steamRise 1.5s ease-in-out infinite;
        }

        .steam-line:nth-child(2) {
          animation-delay: 0.3s;
        }

        .steam-line:nth-child(3) {
          animation-delay: 0.6s;
        }

        @keyframes steamRise {
          0% {
            opacity: 0;
            transform: translateY(0px) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-10px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
        }

        .lightning-indicator {
          font-size: 48px;
          animation: lightningPulse 2s ease-in-out infinite;
          filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.6));
        }

        @keyframes lightningPulse {
          0%, 100% { 
            opacity: 0.8; 
            transform: scale(1) rotate(0deg);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2) rotate(5deg);
          }
        }

        .progress-ring {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 24px;
        }

        .progress-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .progress-bg {
          fill: none;
          stroke: rgba(222, 184, 135, 0.2);
          stroke-width: 4;
        }

        .progress-fill {
          fill: none;
          stroke: url(#italianProgressGradient);
          stroke-width: 4;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
          font-weight: 700;
          color: #6F4E37;
          text-shadow: 0 1px 2px rgba(255,255,255,0.5);
        }

        .loading-text {
          margin-bottom: 32px;
        }

        .main-message {
          font-size: 24px;
          font-weight: 700;
          color: #3C2415;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #6F4E37, #CE2B37);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 1px 2px rgba(255,255,255,0.5);
        }

        .sub-message {
          font-size: 16px;
          color: #8B7355;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .dynamic-message {
          font-size: 14px;
          color: #6F4E37;
          font-weight: 600;
          height: 20px;
          animation: messageGlow 2s ease-in-out infinite;
        }

        @keyframes messageGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 32px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6F4E37, #CE2B37);
          animation: dotBounce 1.4s ease-in-out infinite;
          box-shadow: 0 2px 4px rgba(111, 78, 55, 0.3);
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
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

        .brand-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding-top: 24px;
          border-top: 2px solid rgba(222, 184, 135, 0.3);
        }

        .brand-logo {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-coffee {
          font-size: 32px;
          animation: logoRotate 4s linear infinite;
        }

        .logo-lightning {
          position: absolute;
          top: -8px;
          right: -8px;
          font-size: 16px;
          animation: lightningFlash 2s ease-in-out infinite;
        }

        @keyframes logoRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes lightningFlash {
          0%, 80%, 100% { opacity: 0.3; }
          10%, 70% { opacity: 1; }
        }

        .brand-text {
          text-align: left;
        }

        .brand-text strong {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #3C2415;
          margin-bottom: 4px;
          text-shadow: 0 1px 2px rgba(255,255,255,0.5);
        }

        .brand-text span {
          display: block;
          font-size: 13px;
          color: #6F4E37;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .features {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .features span {
          font-size: 11px;
          color: #8B7355;
          font-weight: 600;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .loading-content {
            padding: 32px 24px;
            margin: 16px;
          }

          .coffee-cup {
            font-size: 48px;
          }

          .lightning-indicator {
            font-size: 36px;
          }

          .main-message {
            font-size: 20px;
          }

          .progress-ring {
            width: 100px;
            height: 100px;
          }

          .brand-info {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }

          .brand-text {
            text-align: center;
          }

          .features {
            flex-direction: row;
            justify-content: center;
            gap: 16px;
          }
        }
      `}</style>

      {/* SVG Gradient Definition for Italian Theme */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="italianProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#009246" />
            <stop offset="50%" stopColor="#6F4E37" />
            <stop offset="100%" stopColor="#CE2B37" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default LoadingScreen;