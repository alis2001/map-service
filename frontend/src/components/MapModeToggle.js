// components/MapModeToggle.js
// Location: /frontend/src/components/MapModeToggle.js

import React from 'react';

const MapModeToggle = ({
  currentMode,
  onModeChange,
  userCount = 0,
  placeCount = 0,
  currentCity,
  isLoading = false
}) => {
  return (
    <>
      <div className="map-mode-toggle">
        <button 
          className={`mode-toggle-btn ${currentMode === 'places' ? 'active' : ''}`}
          onClick={() => onModeChange('places')}
          disabled={isLoading}
        >
          <span className="mode-icon">🏪</span>
          <span className="mode-text">Luoghi</span>
          {currentMode === 'places' && placeCount > 0 && (
            <span className="mode-count">{placeCount}</span>
          )}
        </button>
        
        <button 
          className={`mode-toggle-btn ${currentMode === 'people' ? 'active' : ''}`}
          onClick={() => onModeChange('people')}
          disabled={isLoading}
        >
          <span className="mode-icon">👥</span>
          <span className="mode-text">Persone</span>
          {currentMode === 'people' && userCount > 0 && (
            <span className="mode-count">{userCount}</span>
          )}
        </button>
        
        {currentCity && (
          <div className="current-city">
            <span className="city-icon">📍</span>
            <span className="city-name">{currentCity}</span>
          </div>
        )}
        
        {isLoading && (
          <div className="mode-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>

      <style jsx>{`
        .map-mode-toggle {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 6px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          z-index: 1000;
          display: flex;
          gap: 4px;
          align-items: center;
          flex-wrap: wrap;
          max-width: 320px;
        }

        .mode-toggle-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          min-width: 80px;
          justify-content: center;
        }

        .mode-toggle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mode-toggle-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .mode-toggle-btn:hover:not(.active):not(:disabled) {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        .mode-icon {
          font-size: 14px;
        }

        .mode-text {
          font-size: 12px;
          font-weight: 600;
        }

        .mode-count {
          background: rgba(255, 255, 255, 0.9);
          color: #667eea;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          text-align: center;
        }

        .mode-toggle-btn.active .mode-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .current-city {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          font-size: 12px;
          color: #667eea;
          font-weight: 500;
        }

        .city-icon {
          font-size: 10px;
        }

        .city-name {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mode-loading {
          display: flex;
          align-items: center;
          padding: 8px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive per schermi piccoli */
        @media (max-width: 768px) {
          .map-mode-toggle {
            left: 10px;
            top: 10px;
            max-width: 280px;
          }
          
          .mode-toggle-btn {
            padding: 8px 12px;
            font-size: 12px;
            min-width: 70px;
          }
          
          .mode-text {
            font-size: 11px;
          }
          
          .current-city {
            padding: 6px 10px;
          }
          
          .city-name {
            max-width: 80px;
          }
        }
      `}</style>
    </>
  );
};

export default MapModeToggle;