// components/MapControls.js - COMPLETE UPDATED VERSION - Removed Pubs
// Location: /frontend/src/components/MapControls.js

import React, { useState } from 'react';

const MapControls = ({
  cafeType,
  searchRadius,
  onSearchChange,
  onRefresh,
  onLocationRequest,
  locationLoading,
  hasUserLocation,
  cafesCount,
  isEmbedMode
}) => {
  const [isExpanded, setIsExpanded] = useState(!isEmbedMode);

  const handleTypeChange = (newType) => {
    if (onSearchChange) {
      onSearchChange({ type: newType });
    }
  };

  const handleRadiusChange = (newRadius) => {
    if (onSearchChange) {
      onSearchChange({ radius: parseInt(newRadius) });
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleLocationRequest = () => {
    if (onLocationRequest) {
      onLocationRequest();
    }
  };

  // UPDATED: Type options - removed pub option
  const typeOptions = [
    { 
      value: 'cafe', 
      label: '☕ Bar/Caffè', 
      emoji: '☕',
      description: 'Bar italiani, caffetterie e gelaterie'
    },
    { 
      value: 'restaurant', 
      label: '🍽️ Ristoranti', 
      emoji: '🍽️',
      description: 'Ristoranti, pizzerie e trattorie'
    }
    // REMOVED: pub option
  ];

  const radiusOptions = [
    { value: 500, label: '500m', description: 'Molto vicino' },
    { value: 1000, label: '1km', description: 'Vicino' },
    { value: 1500, label: '1.5km', description: 'Moderato' },
    { value: 2000, label: '2km', description: 'Ampio' },
    { value: 5000, label: '5km', description: 'Esteso' }
  ];

  return (
    <div className={`map-controls ${isEmbedMode ? 'embed-mode' : ''}`}>
      {/* Collapse Button for Embed Mode */}
      {isEmbedMode && (
        <button 
          className="controls-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Nascondi controlli' : 'Mostra controlli'}
        >
          {isExpanded ? '📐' : '⚙️'}
        </button>
      )}

      {/* Main Controls */}
      <div className={`controls-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
        
        {/* Search Stats */}
        <div className="search-stats">
          <div className="stats-item">
            <span className="stats-number">{cafesCount}</span>
            <span className="stats-label">trovati</span>
          </div>
          <div className="stats-item">
            <span className="stats-icon">🎯</span>
            <span className="stats-label">
              {radiusOptions.find(r => r.value === searchRadius)?.label || `${searchRadius}m`}
            </span>
          </div>
          {hasUserLocation && (
            <div className="stats-item">
              <span className="stats-icon">📍</span>
              <span className="stats-label">GPS</span>
            </div>
          )}
        </div>

        {/* Type Selector */}
        <div className="control-group">
          <label className="control-label">Tipo di locale</label>
          <div className="type-buttons">
            {typeOptions.map(option => (
              <button
                key={option.value}
                className={`type-button ${cafeType === option.value ? 'active' : ''}`}
                onClick={() => handleTypeChange(option.value)}
                title={option.description}
              >
                <span className="type-emoji">{option.emoji}</span>
                <span className="type-text">{option.label.split(' ')[1]}</span>
                {cafeType === option.value && (
                  <span className="type-indicator">●</span>
                )}
              </button>
            ))}
          </div>
          
          {/* Type Description */}
          <div className="type-description">
            {typeOptions.find(t => t.value === cafeType)?.description || 'Seleziona un tipo di locale'}
          </div>
        </div>

        {/* Radius Selector */}
        <div className="control-group">
          <label className="control-label">Raggio di ricerca</label>
          <div className="radius-selector">
            <select
              value={searchRadius}
              onChange={(e) => handleRadiusChange(e.target.value)}
              className="radius-select"
            >
              {radiusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            <div className="radius-visual">
              <div 
                className="radius-indicator"
                style={{
                  width: `${Math.min(searchRadius / 50, 100)}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {/* Location Button */}
          <button
            className={`action-button location-button ${hasUserLocation ? 'has-location' : ''}`}
            onClick={handleLocationRequest}
            disabled={locationLoading}
            title={hasUserLocation ? 'Aggiorna posizione' : 'Ottieni posizione'}
          >
            <span className="button-icon">
              {locationLoading ? '🔄' : hasUserLocation ? '📍' : '🎯'}
            </span>
            <span className="button-text">
              {locationLoading ? 'Rilevando...' : hasUserLocation ? 'La tua posizione' : 'Trova posizione'}
            </span>
            {hasUserLocation && (
              <span className="location-status">✓</span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            className="action-button refresh-button"
            onClick={handleRefresh}
            title="Aggiorna dati"
          >
            <span className="button-icon">🔄</span>
            <span className="button-text">Aggiorna</span>
          </button>
        </div>

        {/* UPDATED: Quick Filters - removed pub filter */}
        <div className="quick-filters">
          <div className="filter-label">Filtri rapidi:</div>
          <div className="filter-buttons">
            <button 
              className={`filter-button ${searchRadius === 500 ? 'active' : ''}`}
              onClick={() => handleRadiusChange(500)}
              title="Solo molto vicini"
            >
              🎯 Vicini
            </button>
            <button 
              className={`filter-button ${cafeType === 'cafe' ? 'active' : ''}`}
              onClick={() => handleTypeChange('cafe')}
              title="Caffetterie e bar italiani"
            >
              ☕ Caffè
            </button>
            {/* REMOVED: Pub filter button */}
            <button 
              className={`filter-button ${cafeType === 'restaurant' ? 'active' : ''}`}
              onClick={() => handleTypeChange('restaurant')}
              title="Ristoranti e pizzerie"
            >
              🍽️ Ristoranti
            </button>
          </div>
        </div>

        {/* UPDATED: Italian Venue Info - removed pub info */}
        <div className="venue-info">
          <div className="info-card">
            <div className="info-icon">ℹ️</div>
            <div className="info-content">
              <div className="info-title">Locali italiani</div>
              <div className="info-text">
                {cafeType === 'cafe' && 'I bar italiani servono caffè, aperitivi e spuntini tutto il giorno.'}
                {cafeType === 'restaurant' && 'Ristoranti, pizzerie e osterie per pranzo e cena.'}
                {/* REMOVED: pub info */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="status-indicator">
        <div className={`status-dot ${hasUserLocation ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {hasUserLocation ? 'GPS attivo' : 'GPS non disponibile'}
        </span>
      </div>

      {/* Additional Styles */}
      <style jsx>{`
        .type-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 8px;
          color: white;
        }

        .type-description {
          font-size: 12px;
          color: #6B7280;
          margin-top: 8px;
          padding: 8px;
          background: rgba(79, 70, 229, 0.05);
          border-radius: 8px;
          font-style: italic;
        }

        .location-status {
          font-size: 12px;
          color: #10B981;
          font-weight: bold;
        }

        .filter-button.active {
          background: var(--gradient-primary);
          color: white;
          border-color: transparent;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .venue-info {
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding-top: 12px;
          margin-top: 12px;
        }

        .info-card {
          display: flex;
          gap: 8px;
          background: rgba(79, 70, 229, 0.05);
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(79, 70, 229, 0.1);
        }

        .info-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-title {
          font-size: 12px;
          font-weight: 600;
          color: #4F46E5;
          margin-bottom: 4px;
        }

        .info-text {
          font-size: 11px;
          color: #6B7280;
          line-height: 1.4;
        }

        .stats-item:last-child {
          margin-left: auto;
        }

        .controls-panel {
          max-width: 320px;
          min-width: 280px;
        }

        @media (max-width: 768px) {
          .controls-panel {
            max-width: none;
            min-width: auto;
          }
          
          .filter-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .filter-button:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
};

export default MapControls;