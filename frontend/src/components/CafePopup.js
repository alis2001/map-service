// components/CafePopup.js - BEAUTIFUL WWDC STYLE with Dynamic Status
// Location: /frontend/src/components/CafePopup.js

import React, { useState, useEffect } from 'react';
import { usePlaceDetails } from '../hooks/useCafes';

const CafePopup = ({ cafe, onClose, userLocation }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch detailed place information with real-time updates
  const { 
    place: detailedPlace, 
    loading: detailsLoading,
    currentTime: hookCurrentTime 
  } = usePlaceDetails(cafe.googlePlaceId, userLocation);

  // Use detailed data if available, fallback to basic cafe data
  const placeData = detailedPlace || cafe;

  // Update current time every minute for dynamic status
  useEffect(() => {
    setCurrentTime(hookCurrentTime || new Date());
  }, [hookCurrentTime]);

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

  // Get venue type for styling
  const venueType = placeData.type || placeData.placeType || 'cafe';
  const isRestaurant = venueType === 'restaurant';

  return (
    <div 
      className={`popup-overlay wwdc-style ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`cafe-popup wwdc-popup ${isVisible ? 'visible' : ''}`}>
        
        {/* WWDC Header with Dynamic Gradient */}
        <div className={`popup-header wwdc-header ${isRestaurant ? 'restaurant' : 'cafe'}`}>
          <div className="header-background-animation"></div>
          <div className="header-content">
            {/* Venue Icon with Glow Effect */}
            <div className="venue-icon-container">
              <div className={`venue-icon ${isRestaurant ? 'restaurant' : 'cafe'}`}>
                <span className="icon-emoji">{placeData.emoji || (isRestaurant ? '🍽️' : '☕')}</span>
                <div className="icon-glow"></div>
              </div>
            </div>
            
            {/* Header Text */}
            <div className="header-text">
              <h2 className="venue-name">{placeData.name}</h2>
              <div className="venue-meta">
                <span className="venue-type">
                  {placeData.displayType || (isRestaurant ? 'Ristorante' : 'Bar/Caffetteria')}
                </span>
                {placeData.distance && (
                  <>
                    <span className="meta-separator">•</span>
                    <span className="venue-distance">{placeData.formattedDistance}</span>
                  </>
                )}
                {placeData.walkingTime && (
                  <>
                    <span className="meta-separator">•</span>
                    <span className="walking-time">{placeData.walkingTime}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Close Button with WWDC Style */}
          <button className="close-button wwdc-close" onClick={handleClose}>
            <span className="close-icon">✕</span>
            <div className="close-ripple"></div>
          </button>
        </div>

        {/* Dynamic Status Bar - REAL-TIME */}
        <div className={`status-bar ${placeData.dynamicStatus?.isOpen ? 'open' : 'closed'}`}>
          <div className="status-indicator">
            <div 
              className="status-dot"
              style={{ backgroundColor: placeData.dynamicStatus?.statusColor || '#6B7280' }}
            />
            <span className="status-text">
              {placeData.dynamicStatus?.status || 'Orari non disponibili'}
            </span>
          </div>
          
          {placeData.dynamicStatus?.nextChange && (
            <div className="next-change">
              <span className="next-change-text">
                {placeData.dynamicStatus.nextChange.timeText}
              </span>
            </div>
          )}
          
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* WWDC Stats Cards */}
        <div className="stats-section">
          {placeData.rating && (
            <div className="stat-card rating-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-value">{placeData.rating}</div>
                <div className="stat-label">Valutazione</div>
                {placeData.userRatingsTotal && (
                  <div className="stat-subtitle">{placeData.userRatingsTotal} recensioni</div>
                )}
              </div>
            </div>
          )}
          
          {placeData.priceLevel !== undefined && (
            <div className="stat-card price-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{'€'.repeat(placeData.priceLevel + 1)}</div>
                <div className="stat-label">Prezzo</div>
                <div className="stat-subtitle">{getPriceLevelText(placeData.priceLevel)}</div>
              </div>
            </div>
          )}
          
          <div className="stat-card status-card">
            <div className="stat-icon">
              {placeData.dynamicStatus?.isOpen === null ? '❓' : 
               placeData.dynamicStatus?.isOpen ? '🟢' : '🔴'}
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {placeData.dynamicStatus?.isOpen === null ? 'Sconosciuto' :
                 placeData.dynamicStatus?.isOpen ? 'Aperto' : 'Chiuso'}
              </div>
              <div className="stat-label">Stato Attuale</div>
              <div className="stat-subtitle">
                Aggiornato: {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* WWDC Tab Navigation */}
        <div className="popup-tabs wwdc-tabs">
          <button 
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="tab-icon">📍</span>
            <span className="tab-text">Info</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours')}
          >
            <span className="tab-icon">🕒</span>
            <span className="tab-text">Orari</span>
          </button>
          {placeData.photos && placeData.photos.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <span className="tab-icon">📸</span>
              <span className="tab-text">Foto</span>
            </button>
          )}
          {placeData.reviews && placeData.reviews.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <span className="tab-icon">💬</span>
              <span className="tab-text">Recensioni</span>
            </button>
          )}
        </div>

        {/* Content with Smooth Transitions */}
        <div className="popup-content wwdc-content">
          
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="content-section info-section">
              <div className="info-cards">
                
                {/* Address Card */}
                <div className="info-card">
                  <div className="card-icon">📍</div>
                  <div className="card-content">
                    <div className="card-label">Indirizzo</div>
                    <div className="card-value">{placeData.address}</div>
                  </div>
                </div>

                {/* Contact Cards */}
                {placeData.phoneNumber && (
                  <div className="info-card clickable" onClick={handleCall}>
                    <div className="card-icon">📞</div>
                    <div className="card-content">
                      <div className="card-label">Telefono</div>
                      <div className="card-value phone-link">{placeData.phoneNumber}</div>
                    </div>
                    <div className="card-arrow">→</div>
                  </div>
                )}

                {placeData.website && (
                  <div className="info-card clickable" onClick={handleWebsite}>
                    <div className="card-icon">🌐</div>
                    <div className="card-content">
                      <div className="card-label">Sito Web</div>
                      <div className="card-value website-link">Visita sito</div>
                    </div>
                    <div className="card-arrow">→</div>
                  </div>
                )}

                {/* Business Status Card */}
                <div className="info-card">
                  <div className="card-icon">🏪</div>
                  <div className="card-content">
                    <div className="card-label">Stato Attività</div>
                    <div className="card-value">
                      {getBusinessStatusText(placeData.businessStatus)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Italian Tips Section */}
              {placeData.italianTips && placeData.italianTips.length > 0 && (
                <div className="tips-section">
                  <h4 className="tips-title">💡 Consigli Locali</h4>
                  <div className="tips-cards">
                    {placeData.italianTips.map((tip, index) => (
                      <div key={index} className="tip-card">
                        <span className="tip-text">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hours Tab with Real-time Status */}
          {activeTab === 'hours' && (
            <div className="content-section hours-section">
              
              {/* Live Status Header */}
              <div className={`live-status-card ${placeData.dynamicStatus?.isOpen ? 'open' : 'closed'}`}>
                <div className="status-header">
                  <div className="status-main">
                    <span className="status-icon-large">
                      {placeData.dynamicStatus?.isOpen === null ? '❓' : 
                       placeData.dynamicStatus?.isOpen ? '🟢' : '🔴'}
                    </span>
                    <div className="status-info">
                      <h3 className="status-title">
                        {placeData.dynamicStatus?.status || 'Orari non disponibili'}
                      </h3>
                      {placeData.dynamicStatus?.nextChange && (
                        <p className="status-subtitle">
                          {placeData.dynamicStatus.nextChange.action === 'closes' ? 'Chiude' : 'Apre'} {' '}
                          {placeData.dynamicStatus.nextChange.timeText}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="live-badge">
                    <span className="live-dot pulsing"></span>
                    <span className="live-text">LIVE</span>
                  </div>
                </div>
              </div>
              
              {detailsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Caricamento orari in tempo reale...</span>
                </div>
              ) : (
                <div className="hours-grid">
                  {formatOpeningHours(placeData.openingHours).map((day, index) => {
                    const isToday = new Date().getDay() === index;
                    return (
                      <div key={index} className={`hours-card ${isToday ? 'today' : ''}`}>
                        <span className="day-name">
                          {day.split(':')[0]}
                          {isToday && <span className="today-badge">Oggi</span>}
                        </span>
                        <span className="day-hours">{day.split(':').slice(1).join(':').trim()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && placeData.photos && (
            <div className="content-section photos-section">
              {detailsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Caricamento foto...</span>
                </div>
              ) : (
                <div className="photos-grid">
                  {placeData.photoUrls?.medium?.slice(0, 8).map((photoUrl, index) => (
                    <div key={index} className="photo-card">
                      <img 
                        src={photoUrl} 
                        alt={`${placeData.name} - Foto ${index + 1}`}
                        className="photo-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="photo-overlay">
                        <span className="photo-index">{index + 1}</span>
                      </div>
                    </div>
                  )) || (
                    <div className="no-photos">
                      <span className="no-photos-icon">📸</span>
                      <span className="no-photos-text">Foto non disponibili</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && placeData.reviews && (
            <div className="content-section reviews-section">
              <div className="reviews-grid">
                {placeData.reviews.slice(0, 5).map((review, index) => (
                  <div key={index} className="review-card">
                    <div className="review-header">
                      <div className="reviewer-info">
                        <span className="reviewer-name">{review.authorName}</span>
                        <span className="review-time">{review.timeAgo}</span>
                      </div>
                      <div className="review-rating">
                        <span className="rating-stars">{review.ratingStars}</span>
                        <span className="rating-number">{review.rating}</span>
                      </div>
                    </div>
                    {review.text && (
                      <div className="review-text">
                        {review.text.length > 150 ? 
                          `${review.text.substring(0, 150)}...` : 
                          review.text
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WWDC Action Buttons */}
        <div className={`popup-actions wwdc-actions ${isRestaurant ? 'restaurant' : 'cafe'}`}>
          <button 
            className="action-btn primary-action"
            onClick={handleDirections}
          >
            <span className="btn-icon">🧭</span>
            <span className="btn-text">Indicazioni</span>
            <div className="btn-shine"></div>
          </button>
          
          {placeData.phoneNumber && (
            <button 
              className="action-btn secondary-action"
              onClick={handleCall}
            >
              <span className="btn-icon">📞</span>
              <span className="btn-text">Chiama</span>
            </button>
          )}
          
          {placeData.website && (
            <button 
              className="action-btn secondary-action"
              onClick={handleWebsite}
            >
              <span className="btn-icon">🌐</span>
              <span className="btn-text">Sito</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getPriceLevelText = (priceLevel) => {
  switch (priceLevel) {
    case 0: return 'Gratuito';
    case 1: return 'Economico';
    case 2: return 'Moderato';
    case 3: return 'Costoso';
    case 4: return 'Molto costoso';
    default: return 'Non disponibile';
  }
};

const getBusinessStatusText = (status) => {
  switch (status) {
    case 'OPERATIONAL': return 'Operativo';
    case 'CLOSED_TEMPORARILY': return 'Chiuso temporaneamente';
    case 'CLOSED_PERMANENTLY': return 'Chiuso definitivamente';
    default: return 'Stato sconosciuto';
  }
};

const formatOpeningHours = (openingHours) => {
  if (!openingHours || !openingHours.weekdayTextItalian) {
    const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    return days.map(day => `${day}: Orari non disponibili`);
  }
  
  return openingHours.weekdayTextItalian;
};

export default CafePopup;