// components/MapControls.js - ENHANCED WITH LOCATION CONTROLS
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
  userLocation,
  onLocationRetry,
  onPreciseLocation,
  locationLoading,
  locationError,
  detectionMethod,
  qualityText,
  sourceText
}) => {
  const [isExpanded, setIsExpanded] = useState(!isEmbedMode);
  const [isLocationActionsExpanded, setIsLocationActionsExpanded] = useState(false);

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

  const handleLocationRetry = () => {
    if (onLocationRetry) {
      onLocationRetry();
    }
  };

  const handlePreciseLocation = () => {
    if (onPreciseLocation) {
      onPreciseLocation();
    }
  };

  // Get location status indicator
  const getLocationStatus = () => {
    if (locationLoading) return { text: 'Rilevamento...', color: '#F59E0B', icon: '🔄' };
    if (locationError) return { text: 'Errore posizione', color: '#EF4444', icon: '⚠️' };
    if (!hasUserLocation) return { text: 'Nessuna posizione', color: '#6B7280', icon: '📍' };
    
    // Quality-based status
    if (qualityText === 'excellent') return { text: 'Precisione alta', color: '#10B981', icon: '🎯' };
    if (qualityText === 'good') return { text: 'Buona precisione', color: '#10B981', icon: '📍' };
    if (qualityText === 'acceptable') return { text: 'Precisione media', color: '#F59E0B', icon: '📍' };
    return { text: 'Posizione rilevata', color: '#10B981', icon: '📍' };
  };

  const locationStatus = getLocationStatus();

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
        
        {/* Simple Location Status */}
        <div className="location-status-card">
          <div className="status-header">
            <div className="status-indicator">
              <div 
                className="status-dot"
                style={{ backgroundColor: locationStatus.color }}
              />
              <span className="status-text" style={{ color: locationStatus.color }}>
                {locationStatus.icon} {hasUserLocation ? 'Posizione rilevata' : 'Posizione richiesta'}
              </span>
            </div>
            {!hasUserLocation && (
              <button
                className="location-expand-btn"
                onClick={() => setIsLocationActionsExpanded(!isLocationActionsExpanded)}
                title="Opzioni posizione"
              >
                {isLocationActionsExpanded ? '▼' : '▶'}
              </button>
            )}
          </div>
          
          {/* Location Actions - Only show when no location */}
          {isLocationActionsExpanded && !hasUserLocation && (
            <div className="location-actions">
              <button
                className="location-action-btn retry-btn"
                onClick={handleLocationRetry}
                disabled={locationLoading}
                title="Rileva nuovamente la posizione"
              >
                <span className="btn-icon">🔄</span>
                <span className="btn-text">
                  {locationLoading ? 'Rilevamento...' : 'Rileva Posizione'}
                </span>
              </button>
              
              {locationError && (
                <div className="location-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">
                    Abilita la localizzazione nelle impostazioni del browser
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
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
          <div className="stats-item">
            <span className="stats-icon" style={{ color: locationStatus.color }}>
              {hasUserLocation ? '📍' : '❓'}
            </span>
            <span className="stats-label" style={{ color: locationStatus.color, fontWeight: '600' }}>
              {hasUserLocation ? 'Localizzato' : 'Non localizzato'}
            </span>
          </div>
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
              {hasUserLocation ? 'Nella tua zona' : 'Richiede posizione'}
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
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .location-status-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
          backdrop-filter: blur(10px);
        }

        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .status-text {
          font-size: 14px;
          font-weight: 600;
        }

        .location-expand-btn {
          background: none;
          border: none;
          color: #6B7280;
          font-size: 12px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .location-expand-btn:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #374151;
        }

        .location-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
        }

        .location-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .info-label {
          color: #6B7280;
          font-weight: 500;
        }

        .info-value {
          color: #374151;
          font-weight: 600;
        }

        .location-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .location-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .retry-btn {
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: white;
        }

        .precise-btn {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
        }

        .location-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .location-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-icon {
          font-size: 14px;
        }

        .btn-text {
          flex: 1;
        }

        .location-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          font-size: 12px;
        }

        .error-icon {
          color: #EF4444;
        }

        .error-text {
          color: #DC2626;
          font-weight: 500;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
};

export default MapControls;