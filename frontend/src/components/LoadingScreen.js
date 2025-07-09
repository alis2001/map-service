// components/LoadingScreen.js - Clean Creative Loading
import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Preparazione esperienza...", 
  subMessage = "Un momento per favore"
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    "🗺️ Caricamento mappa...",
    "📍 Rilevamento posizione...",
    "☕ Ricerca locale...",
    "🎯 Calibrazione GPS...",
    "✨ Finalizzazione..."
  ];

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="elegant-loading-screen">
      <div className="elegant-loading-background" />
      
      <div className="elegant-loading-content">
        <div className="elegant-loading-animation">
          <div className="elegant-logo-container">
            <div className="elegant-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
              <div className="center-icon">🗺️</div>
            </div>
          </div>
        </div>

        <div className="elegant-progress-ring">
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
                strokeDasharray: 2 * Math.PI * 54,
                strokeDashoffset: 2 * Math.PI * 54 * (1 - progress / 100)
              }}
            />
          </svg>
          <div className="progress-text">
            {Math.round(progress)}%
          </div>
        </div>

        <div className="elegant-loading-text">
          <h2 className="main-message">{message}</h2>
          <p className="sub-message">{subMessage}</p>
          <p className="dynamic-message">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        <div className="elegant-loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>

      <style>{`
        .elegant-loading-screen {
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

        .elegant-loading-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 25%, #e2e8f0 50%, #f1f5f9 75%, #ffffff 100%);
          background-size: 100% 100%;
          animation: backgroundShift 12s ease-in-out infinite;
        }

        @keyframes backgroundShift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.02) rotate(0.5deg); }
        }

        .elegant-loading-content {
          text-align: center;
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          padding: 48px 36px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.4);
          max-width: 380px;
          width: 90%;
          animation: contentFloat 4s ease-in-out infinite;
        }

        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .elegant-loading-animation {
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .elegant-rings {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid;
          border-color: transparent;
          border-top-color: #6366f1;
        }

        .ring-1 {
          width: 120px;
          height: 120px;
          animation: elegantSpin 3s linear infinite;
        }

        .ring-2 {
          width: 90px;
          height: 90px;
          animation: elegantSpin 2s linear infinite reverse;
          border-top-color: #8b5cf6;
        }

        .ring-3 {
          width: 60px;
          height: 60px;
          animation: elegantSpin 4s linear infinite;
          border-top-color: #ec4899;
        }

        .center-icon {
          font-size: 42px;
          animation: centerPulse 2s ease-in-out infinite;
          z-index: 10;
        }

        @keyframes elegantSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes centerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .elegant-progress-ring {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 28px;
        }

        .progress-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .progress-bg {
          fill: none;
          stroke: rgba(99, 102, 241, 0.1);
          stroke-width: 3;
        }

        .progress-fill {
          fill: none;
          stroke: #6366f1;
          stroke-width: 3;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .elegant-loading-text {
          margin-bottom: 28px;
        }

        .main-message {
          font-size: 22px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sub-message {
          font-size: 15px;
          color: #6b7280;
          margin-bottom: 16px;
          font-weight: 400;
        }

        .dynamic-message {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          height: 20px;
          animation: messageGlow 2s ease-in-out infinite;
        }

        @keyframes messageGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .elegant-loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
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
      `}</style>
    </div>
  );
};

export default LoadingScreen;
