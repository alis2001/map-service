// components/LoadingScreen.js
// Location: /map-service/frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Caricamento...", 
  subMessage = "Un momento per favore" 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    "🗺️ Inizializzazione mappa...",
    "📍 Rilevamento posizione...",
    "☕ Ricerca caffè nelle vicinanze...",
    "✨ Preparazione interfaccia..."
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
        {/* Main Loading Animation */}
        <div className="loading-animation">
          <div className="coffee-cup">
            ☕
          </div>
          <div className="steam">
            <div className="steam-line"></div>
            <div className="steam-line"></div>
            <div className="steam-line"></div>
          </div>
        </div>

        {/* Progress Ring */}
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

        {/* Loading Dots */}
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>

        {/* Brand Info */}
        <div className="brand-info">
          <div className="brand-logo">🗺️</div>
          <div className="brand-text">
            <strong>CoffeeFinder Map</strong>
            <span>Trova i migliori caffè nelle vicinanze</span>
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
            radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(75, 172, 254, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
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
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 48px 32px;
          border-radius: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 400px;
          width: 90%;
          animation: contentFloat 3s ease-in-out infinite;
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
        }

        .coffee-cup {
          font-size: 64px;
          animation: coffeeWiggle 2s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(102, 126, 234, 0.3));
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
          background: linear-gradient(to top, rgba(102, 126, 234, 0.6), transparent);
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
          stroke: rgba(102, 126, 234, 0.1);
          stroke-width: 4;
        }

        .progress-fill {
          fill: none;
          stroke: url(#progressGradient);
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
          color: #4F46E5;
        }

        .loading-text {
          margin-bottom: 32px;
        }

        .main-message {
          font-size: 24px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sub-message {
          font-size: 16px;
          color: #6B7280;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .dynamic-message {
          font-size: 14px;
          color: #4F46E5;
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
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          animation: dotBounce 1.4s ease-in-out infinite;
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
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .brand-logo {
          font-size: 32px;
          animation: logoRotate 4s linear infinite;
        }

        @keyframes logoRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .brand-text {
          text-align: left;
        }

        .brand-text strong {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 2px;
        }

        .brand-text span {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
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

          .main-message {
            font-size: 20px;
          }

          .progress-ring {
            width: 100px;
            height: 100px;
          }

          .brand-info {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }

          .brand-text {
            text-align: center;
          }
        }
      `}</style>

      {/* SVG Gradient Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default LoadingScreen;