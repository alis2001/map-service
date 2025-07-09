// components/MapUpdateLoader.js - SIMPLE & BEAUTIFUL
import React, { useState, useEffect } from 'react';

const MapUpdateLoader = ({ 
  loading = false, 
  searchType = 'cafe'
}) => {
  const [ripplePhase, setRipplePhase] = useState(0);

  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setRipplePhase(prev => (prev + 1) % 3);
    }, 600);
    
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  const getIcon = () => searchType === 'restaurant' ? '🍽️' : '☕';
  const getColor = () => searchType === 'restaurant' ? '#EF4444' : '#F97316'; // Red for restaurant, Orange for cafe

  return (
    <div className="simple-loader-overlay">
      <div className="loader-center">
        <div className="ripple-container">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className={`ripple ${ripplePhase >= i ? 'active' : ''}`}
              style={{
                '--delay': `${i * 0.2}s`,
                '--color': getColor()
              }}
            />
          ))}
          <div className="icon-center" style={{ color: getColor() }}>
            {getIcon()}
          </div>
        </div>
      </div>

      <style>{`
        .simple-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loader-center {
          position: relative;
        }

        .ripple-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ripple {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid var(--color);
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.5);
          animation: rippleWave 1.8s ease-out infinite;
          animation-delay: var(--delay);
        }

        .ripple.active {
          opacity: 1;
          animation: rippleActive 1.8s ease-out infinite;
          animation-delay: var(--delay);
        }

        @keyframes rippleActive {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        .icon-center {
          font-size: 32px;
          z-index: 2;
          animation: iconPulse 1.8s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @media (max-width: 768px) {
          .ripple-container { width: 100px; height: 100px; }
          .icon-center { font-size: 28px; }
        }
      `}</style>
    </div>
  );
};

export default MapUpdateLoader;