// components/MapControls.js - ENHANCED VERSION with Location Detection Info
// Location: /frontend/src/components/MapControls.js

import React, { useState } from 'react';

const MapControls = ({
  cafeType,
  searchRadius,
  onSearchChange,
  onRefresh,
  onLocationRequest,
  onFreshGPSRequest,
  locationLoading,
  hasUserLocation,
  cafesCount,
  isEmbedMode,
  // Enhanced location props
  detectionMethod,
  locationCapability,
  detectionPhase,
  userLocation,
  locationQuality
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

  const handleFreshGPSRequest = () => {
    if (onFreshGPSRequest) {
      onFreshGPSRequest();
    }
  };

  // Enhanced location status display
  const getLocationStatusInfo = () => {
    if (!hasUserLocation && detectionPhase === 'detecting') {
      return {
        icon: '🔄',
        text: 'Rilevando...',
        subtext: `Metodo: ${detectionMethod || 'Auto'}`,
        color: '#3B82F6',
        action: 'detecting'
      };
    }

    if (hasUserLocation && userLocation) {
      const accuracy = userLocation.accuracy ? Math.round(userLocation.accuracy) : 'N/A';
      const source = userLocation.source;
      
      let icon, color, text, subtext;
      
      switch (source) {
        case 'gps':
        case 'gps_live':
          icon = userLocation.source === 'gps_live' ? '🎯' : '📍';
          color = '#10B981';
          text = 'GPS Attivo';
          subtext = `±${accuracy}m • ${userLocation.quality || 'Buona'}`;
          break;
        case 'browser':
          icon = '🌐';
          color = '#8B5CF6';
          text = 'Browser';
          subtext = `±${accuracy}m • Network`;
          break;
        case 'cache':
          icon = '💾';
          color = '#F59E0B';
          text = 'Cache';
          subtext = `±${accuracy}m • Salvata`;
          break;
        default:
          icon = '📍';
          color = '#6B7280';
          text = 'Posizione';
          subtext = `±${accuracy}m`;
      }
      
      return { icon, text, subtext, color, action: 'located' };
    }

    return {
      icon: '❓',
      text: 'Nessuna posizione',
      subtext: 'Clicca per rilevare',
      color: '#6B7280',
      action: 'none'
    };
  };

  const locationStatus = getLocationStatusInfo();

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
        
        {/* Enhanced Search Stats with Location Info */}
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
          <div className="stats-item location-status-item" style={{ borderColor: locationStatus.color }}>
            <span className="stats-icon" style={{ color: locationStatus.color }}>
              {locationStatus.icon}
            </span>
            <div className="location-status-text">
              <span className="stats-label" style={{ color: locationStatus.color, fontWeight: '600' }}>
                {locationStatus.text}
              </span>
              <span className="stats-sublabel" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                {locationStatus.subtext}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Location Panel */}
        <div className="control-group location-panel">
          <label className="control-label">🎯 Posizione & Rilevamento</label>
          
          {/* Location Capability Display */}
          <div className="capability-display">
            <div className="capability-item">
              <span className="capability-icon">
                {locationCapability === 'excellent' ? '📱' :
                 locationCapability === 'good' ? '📲' :
                 locationCapability === 'acceptable' ? '💻' : '⚠️'}
              </span>
              <div className="capability-text">
                <div className="capability-level">
                  {locationCapability === 'excellent' ? 'Eccellente (Mobile GPS)' :
                   locationCapability === 'good' ? 'Buono (Mobile Network)' :
                   locationCapability === 'acceptable' ? 'Accettabile (Desktop)' :
                   locationCapability === 'poor' ? 'Limitato' : 'Sconosciuto'}
                </div>
                <div className="capability-desc">
                  {locationCapability === 'excellent' ? 'GPS ad alta precisione disponibile' :
                   locationCapability === 'good' ? 'Localizzazione mobile affidabile' :
                   locationCapability === 'acceptable' ? 'Localizzazione WiFi/IP' :
                   'Precisione limitata'}
                </div>
              </div>
            </div>
          </div>

          {/* Location Action Buttons */}
          <div className="location-actions">
            <button
              className={`location-action-btn primary ${locationStatus.action}`}
              onClick={handleLocationRequest}
              disabled={detectionPhase === 'detecting'}
              style={{
                background: locationStatus.color,
                opacity: detectionPhase === 'detecting' ? 0.7 : 1
              }}
            >
              <span className="btn-icon">{locationStatus.icon}</span>
              <div className="btn-content">
                <span className="btn-text">
                  {detectionPhase === 'detecting' ? 'Rilevando...' : 
                   hasUserLocation ? 'Aggiorna Posizione' : 'Rileva Posizione'}
                </span>
                <span className="btn-subtext">
                  {detectionPhase === 'detecting' ? detectionMethod || 'Multi-metodo' :
                   hasUserLocation ? 'Refresh automatico' : 'GPS + Browser + Cache'}
                </span>
              </div>
            </button>

            {/* Enhanced GPS Button */}
            {(hasUserLocation || locationCapability === 'excellent') && (
              <button
                className="location-action-btn secondary gps-fresh"
                onClick={handleFreshGPSRequest}
                disabled={detectionPhase === 'detecting'}
                title="Richiedi GPS fresco ad alta precisione"
              >
                <span className="btn-icon">🎯</span>
                <div className="btn-content">
                  <span className="btn-text">GPS Fresco</span>
                  <span className="btn-subtext">Alta precisione</span>
                </div>
              </button>
            )}
          </div>

          {/* Detection Progress Indicator */}
          {detectionPhase === 'detecting' && (
            <div className="detection-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ background: locationStatus.color }}></div>
              </div>
              <div className="progress-text">
                Rilevamento in corso • {detectionMethod || 'Auto-detecting'}
              </div>
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

        {/* Enhanced Action Buttons */}
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

        {/* Enhanced Italian Venue Info */}
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
                  📍 {userLocation.quality === 'excellent' ? 'GPS ultra-preciso' :
                      userLocation.quality === 'good' ? 'GPS buona qualità' :
                      userLocation.quality === 'acceptable' ? 'Localizzazione accettabile' :
                      'Posizione approssimativa'} • 
                  Aggiornato {userLocation.source === 'cache' ? 'dalla cache' : 'dal vivo'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Status Indicator */}
      <div className="status-indicator enhanced">
        <div className={`status-dot ${hasUserLocation ? 'connected' : 'disconnected'}`} 
             style={{ backgroundColor: locationStatus.color }} />
        <span className="status-text">
          {locationStatus.text}
        </span>
        <span className="venue-context"> • Locali italiani</span>
        {hasUserLocation && userLocation?.confidence && (
          <span className="confidence-indicator" style={{ 
            color: locationStatus.color,
            fontSize: '10px',
            fontWeight: '600'
          }}>
            {Math.round(userLocation.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
};

export default MapControls;