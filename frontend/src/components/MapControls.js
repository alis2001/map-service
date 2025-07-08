// components/MapControls.js
// Location: /map-service/frontend/src/components/MapControls.js

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

  const typeOptions = [
    { value: 'cafe', label: '☕ Caffè', emoji: '☕' },
    { value: 'bar', label: '🍺 Bar', emoji: '🍺' },
    { value: 'restaurant', label: '🍽️ Ristoranti', emoji: '🍽️' }
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
            <span className="stats-label">{radiusOptions.find(r => r.value === searchRadius)?.label || `${searchRadius}m`}</span>
          </div>
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
                title={option.label}
              >
                <span className="type-emoji">{option.emoji}</span>
                <span className="type-text">{option.label.split(' ')[1]}</span>
              </button>
            ))}
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

        {/* Quick Filters */}
        <div className="quick-filters">
          <div className="filter-label">Filtri rapidi:</div>
          <div className="filter-buttons">
            <button 
              className="filter-button"
              onClick={() => handleRadiusChange(500)}
              title="Solo molto vicini"
            >
              🎯 Vicini
            </button>
            <button 
              className="filter-button"
              onClick={() => handleTypeChange('cafe')}
              title="Solo caffetterie"
            >
              ☕ Caffè
            </button>
            <button 
              className="filter-button"
              onClick={() => handleTypeChange('bar')}
              title="Solo bar"
            >
              🍺 Bar
            </button>
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
    </div>
  );
};

export default MapControls;