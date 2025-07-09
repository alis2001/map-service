// components/LoadingScreen.js - ENHANCED VERSION with Progress & Retry
// Location: /frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Preparazione esperienza...", 
  subMessage = "Un momento per favore",
  progress = 0,
  showRetry = false,
  onRetry = null
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const loadingMessages = [
    "🗺️ Caricamento mappa...",
    "📍 Rilevamento posizione...",
    "☕ Ricerca locale...",
    "🎯 Calibrazione GPS...",
    "🔗 Connessione servizi...",
    "✨ Finalizzazione..."
  ];

  // Animate progress smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        const diff = progress - prev;
        if (Math.abs(diff) < 1) {
          return progress;
        }
        return prev + (diff * 0.1); // Smooth animation
      });
    }, 50);

    return () => clearInterval(interval);
  }, [progress]);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

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

        {/* Enhanced Progress Ring with Percentage */}
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
                strokeDashoffset: 2 * Math.PI * 54 * (1 - animatedProgress / 100),
                transition: 'stroke-dashoffset 0.3s ease'
              }}
            />
          </svg>
          <div className="progress-text">
            {Math.round(animatedProgress)}%
          </div>
        </div>

        <div className="elegant-loading-text">
          <h2 className="main-message">{message}</h2>
          <p className="sub-message">{subMessage}</p>
          <p className="dynamic-message">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        {/* Progress Steps Indicator */}
        <div className="progress-steps">
          <div className={`step ${animatedProgress >= 20 ? 'completed' : 'pending'}`}>
            <div className="step-icon">🔗</div>
            <div className="step-label">Backend</div>
          </div>
          <div className={`step ${animatedProgress >= 60 ? 'completed' : 'pending'}`}>
            <div className="step-icon">📍</div>
            <div className="step-label">GPS</div>
          </div>
          <div className={`step ${animatedProgress >= 100 ? 'completed' : 'pending'}`}>
            <div className="step-icon">✅</div>
            <div className="step-label">Pronto</div>
          </div>
        </div>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <div className="retry-section">
            <button 
              className="retry-button"
              onClick={onRetry}
            >
              🔄 Riprova Connessione
            </button>
          </div>
        )}

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
          background-size: 400% 400%;
          animation: backgroundShift 8s ease-in-out infinite;
        }

        @keyframes backgroundShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .elegant-loading-content {
          text-align: center;
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          padding: 48px 36px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.4);
          max-width: 420px;
          width: 90%;
          animation: contentFloat 4s ease-in-out infinite;
        }

        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
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
          border: 3px solid;
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
          stroke-width: 4;
        }

        .progress-fill {
          fill: none;
          stroke: url(#progressGradient);
          stroke-width: 4;
          stroke-linecap: round;
        }

        .progress-svg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .progress-svg defs {
          position: absolute;
        }

        .progress-fill {
          stroke: #6366f1;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
          font-weight: 700;
          color: #374151;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .elegant-loading-text {
          margin-bottom: 28px;
        }

        .main-message {
          font-size: 24px;
          font-weight: 700;
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
          line-height: 1.4;
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

        /* Progress Steps */
        .progress-steps {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .step-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .step.pending .step-icon {
          background: rgba(107, 114, 128, 0.1);
          color: #9CA3AF;
          border-color: rgba(107, 114, 128, 0.2);
        }

        .step.completed .step-icon {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
          animation: stepCompleted 0.5s ease;
        }

        @keyframes stepCompleted {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .step-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: color 0.3s ease;
        }

        .step.pending .step-label {
          color: #9CA3AF;
        }

        .step.completed .step-label {
          color: #10B981;
        }

        /* Retry Section */
        .retry-section {
          margin-bottom: 20px;
        }

        .retry-button {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        }

        .retry-button:active {
          transform: translateY(0);
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

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .elegant-loading-content {
            padding: 32px 24px;
            margin: 16px;
            max-width: calc(100% - 32px);
          }

          .main-message {
            font-size: 20px;
          }

          .progress-steps {
            gap: 16px;
          }

          .step-icon {
            width: 28px;
            height: 28px;
            font-size: 14px;
          }

          .step-label {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;