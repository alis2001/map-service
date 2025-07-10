// components/MapControls.js - SIMPLIFIED WITHOUT LOCATION CONTROLS
// Location: /frontend/src/components/MapControls.js

import React, { useState } from 'react';

const MapControls = ({
  cafeType,
  searchRadius,
  onSearchChange,
  onRefresh,
  hasUserLocation,
  cafesCount,
  isEmbedMode,
  userLocation
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

  // Italian venue type options
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
              <span className="stats-icon" style={{ color: '#10B981' }}>📍</span>
              <span className="stats-label" style={{ color: '#10B981', fontWeight: '600' }}>
                Posizione
              </span>
            </div>
          )}
        </div>

        {/* Type Selector */}
        <div className="control-group">
          <label className="control-label">Tipo di locale italiano</label>
          <div className="type-buttons">
            {typeOptions.map(option => (
              <button
                key={option.value}
                className={`type-button ${cafeType === option.value ? 'active' : ''}`}
                data-type={option.value}
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
            {typeOptions.find(t => t.value === cafeType)?.description || 'Seleziona un tipo di locale italiano'}
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
          {/* Refresh Button */}
          <button
            className="action-button refresh-button"
            onClick={handleRefresh}
            title="Aggiorna locali italiani nella zona"
          >
            <span className="button-icon">🔄</span>
            <span className="button-text">Aggiorna Ricerca</span>
            <span className="button-subtext">
              {hasUserLocation ? 'Nella tua zona' : 'In questa area'}
            </span>
          </button>
        </div>

        {/* Italian Quick Filters */}
        <div className="quick-filters">
          <div className="filter-label">Filtri rapidi italiani:</div>
          <div className="filter-buttons">
            <button 
              className={`filter-button ${searchRadius === 500 ? 'active' : ''}`}
              onClick={() => handleRadiusChange(500)}
              title="Solo locali molto vicini"
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
            <button 
              className={`filter-button ${cafeType === 'restaurant' ? 'active' : ''}`}
              onClick={() => handleTypeChange('restaurant')}
              title="Ristoranti e pizzerie"
            >
              🍽️ Ristoranti
            </button>
          </div>
        </div>

        {/* Italian Venue Info */}
        <div className="venue-info">
          <div className="info-card">
            <div className="info-icon">🇮🇹</div>
            <div className="info-content">
              <div className="info-title">Locali italiani autentici</div>
              <div className="info-text">
                {cafeType === 'cafe' && 'I bar italiani servono caffè eccellente, aperitivi e spuntini tutto il giorno. Perfetti per colazione o pausa caffè.'}
                {cafeType === 'restaurant' && 'Ristoranti autentici, pizzerie e osterie per pranzo e cena. Scopri la vera cucina italiana.'}
              </div>
              {hasUserLocation && userLocation && (
                <div className="location-context" style={{ 
                  marginTop: '8px', 
                  fontSize: '11px', 
                  color: '#6B7280',
                  padding: '6px 8px',
                  background: 'rgba(79, 70, 229, 0.05)',
                  borderRadius: '6px'
                }}>
                  📍 Posizione rilevata automaticamente • 
                  {userLocation.source === 'gps' && 'GPS ad alta precisione'}
                  {userLocation.source === 'browser' && 'Localizzazione di rete'}
                  {userLocation.source === 'cache' && 'Posizione salvata'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="status-indicator">
        <div className={`status-dot ${hasUserLocation ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {hasUserLocation ? 'Posizione rilevata' : 'Posizione predefinita'}
        </span>
        <span className="venue-context"> • Locali italiani</span>
      </div>
    </div>
  );
};

export default MapControls;