// components/LoadingScreen.js - ULTRA-FAST OPTIMIZED LOADING
// Location: /frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Caricamento...", 
  subMessage = "",
  progress = 0,
  showRetry = false,
  onRetry = null
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentDot, setCurrentDot] = useState(0);

  // Fast progress animation
  useEffect(() => {
    const targetProgress = Math.max(progress, 10); // Minimum 10% to show activity
    
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 2) {
          clearInterval(interval);
          return targetProgress;
        }
        return prev + (diff * 0.3); // Faster animation
      });
    }, 30); // Faster update rate

    return () => clearInterval(interval);
  }, [progress]);

  // Fast dot animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 3);
    }, 400); // Faster dot cycling

    return () => clearInterval(interval);
  }, []);

  // Auto-progress to feel faster
  useEffect(() => {
    if (progress === 0) {
      // Quick initial progress to make it feel fast
      setTimeout(() => setAnimatedProgress(25), 100);
      setTimeout(() => setAnimatedProgress(50), 300);
    }
  }, [progress]);

  return (
    <div className="fast-loading-screen">
      <div className="fast-loading-content">
        
        {/* Simple, fast icon animation */}
        <div className="fast-loading-icon">
          <div className="icon-main">🗺️</div>
          <div className="icon-pulse"></div>
        </div>

        {/* Streamlined progress display */}
        <div className="fast-progress">
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(animatedProgress, 100)}%` }}
            />
          </div>
          <div className="progress-percentage">
            {Math.round(animatedProgress)}%
          </div>
        </div>

        {/* Simplified text */}
        <div className="fast-loading-text">
          <h3>{message}</h3>
          {subMessage && <p>{subMessage}</p>}
        </div>

        {/* Fast loading dots */}
        <div className="fast-loading-dots">
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
            className="fast-retry-button"
            onClick={onRetry}
          >
            🔄 Riprova
          </button>
        )}
      </div>

      <style>{`
        .fast-loading-screen {
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
          animation: fastFadeIn 0.2s ease-out;
        }

        @keyframes fastFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fast-loading-content {
          text-align: center;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 32px 28px;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          max-width: 280px;
          width: 90%;
          animation: fastSlideUp 0.3s ease-out;
        }

        @keyframes fastSlideUp {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .fast-loading-icon {
          position: relative;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-main {
          font-size: 48px;
          animation: fastIconSpin 2s linear infinite;
          z-index: 2;
          position: relative;
        }

        @keyframes fastIconSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }

        .icon-pulse {
          position: absolute;
          width: 60px;
          height: 60px;
          border: 2px solid rgba(79, 70, 229, 0.3);
          border-radius: 50%;
          animation: fastPulse 1.5s ease-in-out infinite;
        }

        @keyframes fastPulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.2;
          }
        }

        .fast-progress {
          margin-bottom: 18px;
          position: relative;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(79, 70, 229, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4F46E5, #7C3AED, #EC4899);
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: fastShimmer 1s linear infinite;
        }

        @keyframes fastShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-percentage {
          font-size: 14px;
          font-weight: 700;
          color: #4F46E5;
        }

        .fast-loading-text {
          margin-bottom: 16px;
        }

        .fast-loading-text h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 4px;
        }

        .fast-loading-text p {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }

        .fast-loading-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 16px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #CBD5E1;
          transition: all 0.3s ease;
        }

        .dot.active {
          background: #4F46E5;
          transform: scale(1.3);
        }

        .fast-retry-button {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .fast-retry-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .fast-loading-content {
            padding: 24px 20px;
            margin: 12px;
          }

          .icon-main {
            font-size: 40px;
          }

          .fast-loading-text h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;