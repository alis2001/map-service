// components/LoadingScreen.js - ULTRA-FAST LOADING - Show for minimal time
// Location: /frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Caricamento...", 
  subMessage = "",
  progress = 90, // Default to high progress
  showRetry = false,
  onRetry = null
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(progress);
  const [currentDot, setCurrentDot] = useState(0);
  const [autoHide, setAutoHide] = useState(false);

  // ULTRA-FAST progress animation
  useEffect(() => {
    const targetProgress = Math.max(progress, 80); // Always show high progress
    
    // Immediately set high progress
    setAnimatedProgress(targetProgress);
    
    // Auto-hide after 800ms max
    const hideTimer = setTimeout(() => {
      setAutoHide(true);
    }, 800);

    return () => clearTimeout(hideTimer);
  }, [progress]);

  // Fast dot animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 3);
    }, 300); // Faster dot cycling

    return () => clearInterval(interval);
  }, []);

  // Hide if auto-hide is triggered
  if (autoHide && !showRetry) {
    return null;
  }

  return (
    <div className="ultra-fast-loading-screen">
      <div className="ultra-fast-loading-content">
        
        {/* Minimal, fast icon */}
        <div className="ultra-fast-loading-icon">
          <div className="icon-main">🗺️</div>
          <div className="icon-pulse"></div>
        </div>

        {/* Fast progress bar */}
        <div className="ultra-fast-progress">
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(animatedProgress, 100)}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(animatedProgress)}% • Quasi pronto
          </div>
        </div>

        {/* Simple text */}
        <div className="ultra-fast-loading-text">
          <h3>{message}</h3>
          {subMessage && <p>{subMessage}</p>}
        </div>

        {/* Ultra-fast loading dots */}
        <div className="ultra-fast-loading-dots">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className={`dot ${currentDot === i ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Retry button if needed */}
        {showRetry && onRetry && (
          <button 
            className="ultra-fast-retry-button"
            onClick={onRetry}
          >
            🔄 Riprova
          </button>
        )}
      </div>

      <style>{`
        .ultra-fast-loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: ultraFastFadeIn 0.1s ease-out;
        }

        @keyframes ultraFastFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ultra-fast-loading-content {
          text-align: center;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          max-width: 260px;
          width: 90%;
          animation: ultraFastSlideUp 0.2s ease-out;
        }

        @keyframes ultraFastSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ultra-fast-loading-icon {
          position: relative;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-main {
          font-size: 42px;
          animation: ultraFastIconSpin 1.5s linear infinite;
          z-index: 2;
          position: relative;
        }

        @keyframes ultraFastIconSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }

        .icon-pulse {
          position: absolute;
          width: 50px;
          height: 50px;
          border: 2px solid rgba(79, 70, 229, 0.3);
          border-radius: 50%;
          animation: ultraFastPulse 1s ease-in-out infinite;
        }

        @keyframes ultraFastPulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.2;
          }
        }

        .ultra-fast-progress {
          margin-bottom: 16px;
          position: relative;
        }

        .progress-track {
          width: 100%;
          height: 4px;
          background: rgba(79, 70, 229, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4F46E5, #7C3AED, #EC4899);
          border-radius: 2px;
          transition: width 0.2s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: ultraFastShimmer 0.8s linear infinite;
        }

        @keyframes ultraFastShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          font-size: 11px;
          font-weight: 600;
          color: #4F46E5;
        }

        .ultra-fast-loading-text {
          margin-bottom: 12px;
        }

        .ultra-fast-loading-text h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 2px;
        }

        .ultra-fast-loading-text p {
          font-size: 12px;
          color: #6B7280;
          margin: 0;
        }

        .ultra-fast-loading-dots {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-bottom: 12px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #CBD5E1;
          transition: all 0.2s ease;
        }

        .dot.active {
          background: #4F46E5;
          transform: scale(1.2);
        }

        .ultra-fast-retry-button {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ultra-fast-retry-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .ultra-fast-loading-content {
            padding: 20px 16px;
            margin: 8px;
          }

          .icon-main {
            font-size: 36px;
          }

          .ultra-fast-loading-text h3 {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;