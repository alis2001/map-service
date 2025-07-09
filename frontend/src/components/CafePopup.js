// components/CafePopup.js - UPDATED VERSION - No Pub Support
// Location: /map-service/frontend/src/components/CafePopup.js

import React, { useState, useEffect } from 'react';
import { usePlaceDetails } from '../hooks/useCafes';

const CafePopup = ({ cafe, onClose, userLocation }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Fetch detailed place information
  const { 
    place: detailedPlace, 
    loading: detailsLoading 
  } = usePlaceDetails(cafe.googlePlaceId, userLocation);

  // Use detailed data if available, fallback to basic cafe data
  const placeData = detailedPlace || cafe;

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const getBusinessStatusColor = (status) => {
    switch (status) {
      case 'OPERATIONAL': return '#10B981';
      case 'CLOSED_TEMPORARILY': return '#F59E0B';
      case 'CLOSED_PERMANENTLY': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBusinessStatusText = (status) => {
    switch (status) {
      case 'OPERATIONAL': return 'Aperto';
      case 'CLOSED_TEMPORARILY': return 'Chiuso temporaneamente';
      case 'CLOSED_PERMANENTLY': return 'Chiuso definitivamente';
      default: return 'Stato sconosciuto';
    }
  };

  const formatOpeningHours = (openingHours) => {
    if (!openingHours || !openingHours.weekdayText) {
      return ['Orari non disponibili'];
    }
    
    return openingHours.weekdayText.map(day => {
      // Translate day names to Italian
      return day
        .replace('Monday', 'Lunedì')
        .replace('Tuesday', 'Martedì')
        .replace('Wednesday', 'Mercoledì')
        .replace('Thursday', 'Giovedì')
        .replace('Friday', 'Venerdì')
        .replace('Saturday', 'Sabato')
        .replace('Sunday', 'Domenica');
    });
  };

  const getPriceLevelText = (priceLevel) => {
    switch (priceLevel) {
      case 0: return 'Gratuito';
      case 1: return 'Economico (€)';
      case 2: return 'Moderato (€€)';
      case 3: return 'Costoso (€€€)';
      case 4: return 'Molto costoso (€€€€)';
      default: return 'Prezzo non disponibile';
    }
  };

  // UPDATED: Italian venue type display (no pub support)
  const getItalianVenueTypeDisplay = (type) => {
    switch (type) {
      case 'cafe': return 'Caffetteria/Bar';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  };

  // UPDATED: Italian venue emoji mapping (no pub emojis)
  const getItalianVenueEmoji = (venue) => {
    const nameLower = (venue.name || '').toLowerCase();
    
    // Specific Italian venue types
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    if (nameLower.includes('caffè') || nameLower.includes('caffe')) return '☕';
    
    // REMOVED: All pub-related emoji logic
    
    // Default based on type
    switch (venue.type || venue.placeType) {
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  };

  const handleDirections = () => {
    const destination = `${placeData.location.latitude},${placeData.location.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  const handleCall = () => {
    if (placeData.phoneNumber) {
      window.open(`tel:${placeData.phoneNumber}`, '_self');
    }
  };

  const handleWebsite = () => {
    if (placeData.website) {
      window.open(placeData.website, '_blank');
    }
  };

  return (
    <div 
      className={`popup-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`cafe-popup ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="popup-header" data-venue-type={placeData.type || placeData.placeType}>
          <div className="header-content">
            <div className="cafe-emoji">{getItalianVenueEmoji(placeData)}</div>
            <div className="header-text">
              <h2 className="cafe-name">{placeData.name}</h2>
              <div className="cafe-meta">
                <span className="cafe-type">
                  {getItalianVenueTypeDisplay(placeData.type || placeData.placeType)}
                </span>
                {placeData.distance && (
                  <>
                    <span className="meta-separator">•</span>
                    <span className="cafe-distance">{placeData.formattedDistance}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          {placeData.rating && (
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{placeData.rating}</span>
              <span className="stat-label">rating</span>
            </div>
          )}
          
          {placeData.priceLevel !== undefined && (
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <span className="stat-value">{'€'.repeat(placeData.priceLevel + 1)}</span>
              <span className="stat-label">prezzo</span>
            </div>
          )}
          
          <div className="stat-item">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getBusinessStatusColor(placeData.businessStatus) }}
            />
            <span className="stat-value">{getBusinessStatusText(placeData.businessStatus)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="popup-tabs">
          <button 
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📍 Info
          </button>
          <button 
            className={`tab-button ${activeTab === 'hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours')}
          >
            🕒 Orari
          </button>
          {placeData.photos && placeData.photos.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              📸 Foto
            </button>
          )}
        </div>

        {/* Content */}
        <div className="popup-content">
          
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="info-content">
              <div className="info-item">
                <div className="info-icon">📍</div>
                <div className="info-text">
                  <div className="info-label">Indirizzo</div>
                  <div className="info-value">{placeData.address}</div>
                </div>
              </div>

              {placeData.phoneNumber && (
                <div className="info-item clickable" onClick={handleCall}>
                  <div className="info-icon">📞</div>
                  <div className="info-text">
                    <div className="info-label">Telefono</div>
                    <div className="info-value phone-number">{placeData.phoneNumber}</div>
                  </div>
                </div>
              )}

              {placeData.website && (
                <div className="info-item clickable" onClick={handleWebsite}>
                  <div className="info-icon">🌐</div>
                  <div className="info-text">
                    <div className="info-label">Sito web</div>
                    <div className="info-value website-link">Visita sito</div>
                  </div>
                </div>
              )}

              {placeData.priceLevel !== undefined && (
                <div className="info-item">
                  <div className="info-icon">💰</div>
                  <div className="info-text">
                    <div className="info-label">Fascia di prezzo</div>
                    <div className="info-value">{getPriceLevelText(placeData.priceLevel)}</div>
                  </div>
                </div>
              )}

              {/* UPDATED: Italian venue type information */}
              <div className="info-item">
                <div className="info-icon">
                  {getItalianVenueEmoji(placeData)}
                </div>
                <div className="info-text">
                  <div className="info-label">Tipo di locale</div>
                  <div className="info-value">
                    {getItalianVenueTypeDisplay(placeData.type || placeData.placeType)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hours Tab */}
          {activeTab === 'hours' && (
            <div className="hours-content">
              {detailsLoading ? (
                <div className="loading-hours">
                  <div className="loading-spinner-small"></div>
                  <span>Caricamento orari...</span>
                </div>
              ) : (
                <div className="hours-list">
                  {formatOpeningHours(placeData.openingHours).map((day, index) => (
                    <div key={index} className="hours-item">
                      <span className="day-name">{day.split(':')[0]}</span>
                      <span className="day-hours">{day.split(':').slice(1).join(':')}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {placeData.openingHours?.openNow !== undefined && (
                <div className={`open-status ${placeData.openingHours.openNow ? 'open' : 'closed'}`}>
                  <span className="status-indicator">
                    {placeData.openingHours.openNow ? '🟢 Aperto ora' : '🔴 Chiuso ora'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && placeData.photos && (
            <div className="photos-content">
              {detailsLoading ? (
                <div className="loading-photos">
                  <div className="loading-spinner-small"></div>
                  <span>Caricamento foto...</span>
                </div>
              ) : (
                <div className="photos-grid">
                  {placeData.photoUrls?.medium?.slice(0, 6).map((photoUrl, index) => (
                    <div key={index} className="photo-item">
                      <img 
                        src={photoUrl} 
                        alt={`${placeData.name} - Foto ${index + 1}`}
                        className="photo-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )) || (
                    <div className="no-photos">
                      <span>📸 Foto non disponibili</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="popup-actions" data-venue-type={placeData.type || placeData.placeType}>
          <button 
            className="action-btn primary"
            onClick={handleDirections}
          >
            🧭 Indicazioni
          </button>
          
          {placeData.phoneNumber && (
            <button 
              className="action-btn secondary"
              onClick={handleCall}
            >
              📞 Chiama
            </button>
          )}
          
          {placeData.website && (
            <button 
              className="action-btn secondary"
              onClick={handleWebsite}
            >
              🌐 Sito
            </button>
          )}
        </div>

        {/* UPDATED: Italian venue tips (no pub information) */}
        <div className="venue-tips" style={{
          background: 'rgba(79, 70, 229, 0.05)',
          margin: '0 20px 20px 20px',
          padding: '12px',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#6B7280'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4F46E5' }}>
            💡 Consiglio locale
          </div>
          {(placeData.type || placeData.placeType) === 'cafe' && 
            'I bar italiani servono caffè eccellente e aperitivi dalle 18:00.'
          }
          {(placeData.type || placeData.placeType) === 'restaurant' && 
            'I ristoranti italiani spesso aprono alle 19:30 per cena.'
          }
        </div>
      </div>
    </div>
  );
};

export default CafePopup;