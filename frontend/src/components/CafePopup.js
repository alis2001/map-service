// components/CafePopup.js - ENHANCED VERSION with Dynamic Opening Hours
// Location: /map-service/frontend/src/components/CafePopup.js

import React, { useState, useEffect } from 'react';
import { usePlaceDetails } from '../hooks/useCafes';

const CafePopup = ({ cafe, onClose, userLocation }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch detailed place information
  const { 
    place: detailedPlace, 
    loading: detailsLoading 
  } = usePlaceDetails(cafe.googlePlaceId, userLocation);

  // Use detailed data if available, fallback to basic cafe data
  const placeData = detailedPlace || cafe;

  // Update current time every minute for dynamic status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

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

  // ENHANCED: Dynamic opening status calculation
  const calculateOpeningStatus = (openingHours) => {
    if (!openingHours || !openingHours.periods || openingHours.periods.length === 0) {
      return {
        isOpen: null,
        status: 'Orari non disponibili',
        statusColor: '#6B7280',
        nextChange: null,
        confidence: 'unknown'
      };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    console.log('🕐 Current time analysis:', {
      day: currentDay,
      time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      timeMinutes: currentTimeMinutes
    });

    // Find today's opening hours
    const todayPeriods = openingHours.periods.filter(period => {
      const openDay = period.open?.day;
      return openDay === currentDay;
    });

    console.log('📅 Today periods:', todayPeriods);

    if (todayPeriods.length === 0) {
      // Check if place is closed today
      return {
        isOpen: false,
        status: 'Chiuso oggi',
        statusColor: '#EF4444',
        nextChange: getNextOpeningTime(openingHours.periods, currentDay),
        confidence: 'high'
      };
    }

    // Check if currently open
    for (const period of todayPeriods) {
      const openTime = period.open?.time;
      const closeTime = period.close?.time;
      
      if (!openTime) continue;

      const openMinutes = parseTimeToMinutes(openTime);
      const closeMinutes = closeTime ? parseTimeToMinutes(closeTime) : null;

      console.log('⏰ Checking period:', {
        open: openTime,
        close: closeTime,
        openMinutes,
        closeMinutes,
        currentTimeMinutes
      });

      // Handle different scenarios
      if (closeMinutes === null) {
        // Open 24 hours
        return {
          isOpen: true,
          status: 'Aperto 24 ore',
          statusColor: '#10B981',
          nextChange: null,
          confidence: 'high'
        };
      }

      if (closeMinutes > openMinutes) {
        // Normal day (doesn't cross midnight)
        if (currentTimeMinutes >= openMinutes && currentTimeMinutes < closeMinutes) {
          const minutesUntilClose = closeMinutes - currentTimeMinutes;
          return {
            isOpen: true,
            status: minutesUntilClose < 60 ? 
              `Aperto - Chiude tra ${minutesUntilClose} min` : 
              'Aperto ora',
            statusColor: minutesUntilClose < 30 ? '#F59E0B' : '#10B981',
            nextChange: {
              action: 'closes',
              time: formatMinutesToTime(closeMinutes),
              minutesUntil: minutesUntilClose
            },
            confidence: 'high'
          };
        }
      } else {
        // Crosses midnight
        if (currentTimeMinutes >= openMinutes || currentTimeMinutes < closeMinutes) {
          const minutesUntilClose = currentTimeMinutes < closeMinutes ? 
            closeMinutes - currentTimeMinutes : 
            (24 * 60) - currentTimeMinutes + closeMinutes;
          
          return {
            isOpen: true,
            status: minutesUntilClose < 60 ? 
              `Aperto - Chiude tra ${minutesUntilClose} min` : 
              'Aperto ora',
            statusColor: minutesUntilClose < 30 ? '#F59E0B' : '#10B981',
            nextChange: {
              action: 'closes',
              time: formatMinutesToTime(closeMinutes),
              minutesUntil: minutesUntilClose
            },
            confidence: 'high'
          };
        }
      }
    }

    // Not currently open, find next opening
    const nextOpening = getNextOpeningTime(openingHours.periods, currentDay, currentTimeMinutes);
    
    return {
      isOpen: false,
      status: nextOpening ? 
        `Chiuso - Apre ${nextOpening.timeText}` : 
        'Chiuso',
      statusColor: '#EF4444',
      nextChange: nextOpening,
      confidence: 'high'
    };
  };

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeString) => {
    if (!timeString || timeString.length !== 4) return 0;
    const hours = parseInt(timeString.substring(0, 2));
    const minutes = parseInt(timeString.substring(2, 4));
    return hours * 60 + minutes;
  };

  // Helper function to format minutes back to time
  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Find next opening time
  const getNextOpeningTime = (periods, currentDay, currentTimeMinutes = 0) => {
    // Look for next opening in the coming week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDay = (currentDay + dayOffset) % 7;
      const dayPeriods = periods.filter(p => p.open?.day === checkDay);
      
      for (const period of dayPeriods) {
        const openMinutes = parseTimeToMinutes(period.open?.time);
        
        if (dayOffset === 0 && openMinutes <= currentTimeMinutes) {
          continue; // Skip if already passed today
        }
        
        const dayNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        const timeText = dayOffset === 0 ? 
          `alle ${formatMinutesToTime(openMinutes)}` :
          dayOffset === 1 ? 
          `domani alle ${formatMinutesToTime(openMinutes)}` :
          `${dayNames[checkDay]} alle ${formatMinutesToTime(openMinutes)}`;
        
        return {
          day: checkDay,
          time: formatMinutesToTime(openMinutes),
          timeText,
          dayOffset
        };
      }
    }
    
    return null;
  };

  // Get dynamic opening status
  const openingStatus = calculateOpeningStatus(placeData.openingHours);

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
      case 'OPERATIONAL': return 'Operativo';
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
        .replace('Sunday', 'Domenica')
        .replace('Closed', 'Chiuso');
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

  const getItalianVenueTypeDisplay = (type) => {
    switch (type) {
      case 'cafe': return 'Caffetteria/Bar';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  };

  const getItalianVenueEmoji = (venue) => {
    const nameLower = (venue.name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    if (nameLower.includes('caffè') || nameLower.includes('caffe')) return '☕';
    
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

        {/* Quick Stats with Dynamic Status */}
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
          
          {/* ENHANCED: Dynamic Opening Status */}
          <div className="stat-item dynamic-status">
            <span 
              className="status-dot" 
              style={{ backgroundColor: openingStatus.statusColor }}
            />
            <span 
              className="stat-value dynamic-status-text" 
              style={{ color: openingStatus.statusColor }}
            >
              {openingStatus.status}
            </span>
            {openingStatus.confidence === 'high' && (
              <span className="status-confidence">✓</span>
            )}
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

          {/* ENHANCED Hours Tab with Dynamic Status */}
          {activeTab === 'hours' && (
            <div className="hours-content">
              
              {/* Dynamic Status Header */}
              <div className={`dynamic-status-header ${openingStatus.isOpen ? 'open' : 'closed'}`}>
                <div className="status-main">
                  <span className="status-icon">
                    {openingStatus.isOpen === null ? '❓' : 
                     openingStatus.isOpen ? '🟢' : '🔴'}
                  </span>
                  <span className="status-text">{openingStatus.status}</span>
                </div>
                
                {openingStatus.nextChange && (
                  <div className="next-change">
                    <span className="next-change-text">
                      {openingStatus.nextChange.action === 'closes' ? 
                        'Chiude' : 'Apre'} {openingStatus.nextChange.timeText || openingStatus.nextChange.time}
                    </span>
                  </div>
                )}
                
                <div className="last-updated">
                  Aggiornato: {currentTime.toLocaleTimeString('it-IT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              
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

        {/* Italian venue tips */}
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

      {/* Enhanced CSS for dynamic status */}
      <style jsx>{`
        .dynamic-status {
          flex-direction: column !important;
          align-items: center !important;
          gap: 2px !important;
        }

        .dynamic-status-text {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-align: center !important;
          line-height: 1.2 !important;
        }

        .status-confidence {
          color: #10B981;
          font-size: 10px;
          font-weight: bold;
        }

        .dynamic-status-header {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          border: 2px solid transparent;
        }

        .dynamic-status-header.open {
          border-color: #10B981;
          background: rgba(16, 185, 129, 0.05);
        }

        .dynamic-status-header.closed {
          border-color: #EF4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .status-main {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .status-icon {
          font-size: 20px;
        }

        .next-change {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .next-change-text {
          font-weight: 500;
        }

        .last-updated {
          font-size: 11px;
          color: #9CA3AF;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default CafePopup;