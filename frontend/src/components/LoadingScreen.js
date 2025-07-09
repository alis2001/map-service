// components/LoadingScreen.js - Apple WWDC Style
import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  message = "Initializing Map Experience...", 
  subMessage = "Preparing Apple-style location services" 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    "🗺️ Initializing Apple Maps experience...",
    "📍 Acquiring precise GPS location...",
    "☕ Discovering nearby coffee shops...",
    "🍽️ Finding amazing restaurants...",
    "⚡ Activating live location tracking...",
    "✨ Preparing beautiful interface..."
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
    <div className="apple-loading-screen">
      <div className="apple-loading-background" />
      
      <div className="apple-loading-content">
        {/* Apple Logo Animation */}
        <div className="apple-loading-animation">
          <div className="apple-logo-container">
            <div className="apple-logo">
              <div className="logo-ring ring-1"></div>
              <div className="logo-ring ring-2"></div>
              <div className="logo-ring ring-3"></div>
              <div className="logo-center">🗺️</div>
            </div>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="apple-progress-ring">
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
        <div className="apple-loading-text">
          <h2 className="main-message">{message}</h2>
          <p className="sub-message">{subMessage}</p>
          <p className="dynamic-message">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        {/* Apple Loading Dots */}
        <div className="apple-loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>

      <style jsx>{`
        .apple-loading-screen {
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

        .apple-loading-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(75, 172, 254, 0.3) 0%, transparent 50%);
          background-size: 100% 100%;
          animation: backgroundFloat 8s ease-in-out infinite;
        }

        @keyframes backgroundFloat {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(2deg); }
        }

        .apple-loading-content {
          text-align: center;
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          padding: 48px 32px;
          border-radius: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 420px;
          width: 90%;
          animation: contentFloat 3s ease-in-out infinite;
        }

        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .apple-loading-animation {
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apple-logo-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apple-logo {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
          background: linear-gradient(45deg, #667eea, #764ba2, #f093fb, #f5576c) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }

        .ring-1 {
          width: 120px;
          height: 120px;
          animation: appleSpin 3s linear infinite;
        }

        .ring-2 {
          width: 90px;
          height: 90px;
          animation: appleSpin 2s linear infinite reverse;
        }

        .ring-3 {
          width: 60px;
          height: 60px;
          animation: appleSpin 4s linear infinite;
        }

        .logo-center {
          font-size: 48px;
          animation: appleFloat 2s ease-in-out infinite;
        }

        @keyframes appleSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes appleFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }

        .apple-progress-ring {
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
          stroke: rgba(102, 126, 234, 0.2);
          stroke-width: 4;
        }

        .progress-fill {
          fill: none;
          stroke: url(#appleProgressGradient);
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
          color: #374151;
        }

        .apple-loading-text {
          margin-bottom: 32px;
        }

        .main-message {
          font-size: 24px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sub-message {
          font-size: 16px;
          color: #6B7280;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .dynamic-message {
          font-size: 14px;
          color: #374151;
          font-weight: 600;
          height: 20px;
          animation: messageGlow 2s ease-in-out infinite;
        }

        @keyframes messageGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .apple-loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
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

        @media (max-width: 480px) {
          .apple-loading-content {
            padding: 32px 24px;
            margin: 16px;
          }
          
          .apple-logo {
            width: 100px;
            height: 100px;
          }
          
          .logo-center {
            font-size: 36px;
          }
          
          .main-message {
            font-size: 20px;
          }
        }
      `}</style>

      {/* SVG Gradient Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="appleProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="50%" stopColor="#764ba2" />
            <stop offset="100%" stopColor="#f093fb" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default LoadingScreen;