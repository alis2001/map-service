// components/LoadingScreen.js - ENHANCED WITH RATE LIMIT RECOVERY
// Location: /frontend/src/components/LoadingScreen.js

import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Caricamento...", 
  subMessage = "",
  progress = 90, // Default to high progress
  showRetry = false,
  onRetry = null,
  isRateLimitRecovery = false // NEW PROP for rate limit recovery
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(progress);
  const [currentDot, setCurrentDot] = useState(0);
  const [autoHide, setAutoHide] = useState(false);
  const [countdown, setCountdown] = useState(3); // NEW: countdown for rate limit recovery

  // ENHANCED: Handle rate limit recovery countdown
  useEffect(() => {
    if (isRateLimitRecovery) {
      setAnimatedProgress(100);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      // ULTRA-FAST progress animation for normal loading
      const targetProgress = Math.max(progress, 80); // Always show high progress
      
      // Immediately set high progress
      setAnimatedProgress(targetProgress);
      
      // Auto-hide after 800ms max
      const hideTimer = setTimeout(() => {
        setAutoHide(true);
      }, 800);

      return () => clearTimeout(hideTimer);
    }
  }, [progress, isRateLimitRecovery]);

  // Fast dot animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 3);
    }, isRateLimitRecovery ? 500 : 300); // Slower for rate limit recovery

    return () => clearInterval(interval);
  }, [isRateLimitRecovery]);

  // Hide if auto-hide is triggered and not rate limit recovery
  if (autoHide && !showRetry && !isRateLimitRecovery) {
    return null;
  }

  return (
    <div className={`ultra-fast-loading-screen ${isRateLimitRecovery ? 'rate-limit-recovery' : ''}`}>
      <div className="ultra-fast-loading-content">
        
        {/* Enhanced icon for rate limit recovery */}
        <div className="ultra-fast-loading-icon">
          <div className="icon-main">
            {isRateLimitRecovery ? '🔄' : '🗺️'}
          </div>
          <div className="icon-pulse"></div>
        </div>

        {/* Enhanced progress bar */}
        <div className="ultra-fast-progress">
          <div className="progress-track">
            <div 
              className={`progress-fill ${isRateLimitRecovery ? 'rate-limit-fill' : ''}`}
              style={{ width: `${Math.min(animatedProgress, 100)}%` }}
            />
          </div>
          <div className="progress-text">
            {isRateLimitRecovery 
              ? `Ricarico in ${countdown}s` 
              : `${Math.round(animatedProgress)}% • Quasi pronto`
            }
          </div>
        </div>

        {/* Enhanced text with rate limit messages */}
        <div className="ultra-fast-loading-text">
          <h3>
            {isRateLimitRecovery 
              ? "Troppo veloce!" 
              : message
            }
          </h3>
          {subMessage && <p>{subMessage}</p>}
          {isRateLimitRecovery && (
            <p>Sto ricaricando l'applicazione per tornare operativo...</p>
          )}
        </div>

        {/* Ultra-fast loading dots */}
        <div className="ultra-fast-loading-dots">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className={`dot ${currentDot === i ? 'active' : ''} ${isRateLimitRecovery ? 'recovery-dot' : ''}`}
            />
          ))}
        </div>

        {/* Retry button */}
        {showRetry && onRetry && !isRateLimitRecovery && (
          <button className="ultra-fast-retry-button" onClick={onRetry}>
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
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: ultraFastFadeIn 0.2s ease;
        }

        .ultra-fast-loading-screen.rate-limit-recovery {
          background: rgba(239, 68, 68, 0.1);
          backdrop-filter: blur(12px);
        }

        @keyframes ultraFastFadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(8px);
          }
        }

        .ultra-fast-loading-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          max-width: 280px;
          width: 90%;
          position: relative;
          animation: ultraFastSlideUp 0.3s ease;
        }

        .rate-limit-recovery .ultra-fast-loading-content {
          border: 2px solid rgba(239, 68, 68, 0.3);
          background: rgba(255, 255, 255, 0.98);
        }

        @keyframes ultraFastSlideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .ultra-fast-loading-icon {
          margin-bottom: 20px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-main {
          font-size: 42px;
          animation: ultraFastIconSpin 2s linear infinite;
          z-index: 2;
          position: relative;
        }

        .rate-limit-recovery .icon-main {
          animation: ultraFastRecoverySpin 1.5s ease-in-out infinite;
          filter: hue-rotate(0deg);
        }

        @keyframes ultraFastIconSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes ultraFastRecoverySpin {
          0%, 100% { 
            transform: rotate(0deg) scale(1);
            filter: hue-rotate(0deg);
          }
          25% { 
            transform: rotate(90deg) scale(1.1);
            filter: hue-rotate(90deg);
          }
          50% { 
            transform: rotate(180deg) scale(1.05);
            filter: hue-rotate(180deg);
          }
          75% { 
            transform: rotate(270deg) scale(1.1);
            filter: hue-rotate(270deg);
          }
        }

        .icon-pulse {
          position: absolute;
          width: 50px;
          height: 50px;
          border: 2px solid rgba(79, 70, 229, 0.3);
          border-radius: 50%;
          animation: ultraFastPulse 1s ease-in-out infinite;
        }

        .rate-limit-recovery .icon-pulse {
          border-color: rgba(239, 68, 68, 0.4);
          animation: ultraFastRecoveryPulse 1.2s ease-in-out infinite;
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

        @keyframes ultraFastRecoveryPulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.1;
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

        .rate-limit-recovery .progress-track {
          background: rgba(239, 68, 68, 0.1);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4F46E5, #7C3AED, #EC4899);
          border-radius: 2px;
          transition: width 0.2s ease;
          position: relative;
        }

        .progress-fill.rate-limit-fill {
          background: linear-gradient(90deg, #EF4444, #DC2626, #B91C1C);
          animation: rateLimitPulse 1s ease-in-out infinite;
        }

        @keyframes rateLimitPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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

        .rate-limit-recovery .progress-text {
          color: #EF4444;
          font-weight: 700;
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

        .rate-limit-recovery .ultra-fast-loading-text h3 {
          color: #DC2626;
          font-weight: 700;
        }

        .ultra-fast-loading-text p {
          font-size: 12px;
          color: #6B7280;
          margin: 0;
        }

        .rate-limit-recovery .ultra-fast-loading-text p {
          color: #7F1D1D;
          font-weight: 500;
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

        .dot.recovery-dot {
          background: #FCA5A5;
        }

        .dot.recovery-dot.active {
          background: #EF4444;
          transform: scale(1.3);
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