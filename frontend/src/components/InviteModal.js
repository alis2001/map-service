// Enhanced Invitation Modal - Complete with Location Selection Animation
// Location: /frontend/src/components/InviteModal.js

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar, Clock, MessageSquare, Send, ArrowLeft, Search, Filter, Minimize2, Maximize2 } from 'lucide-react';

const InviteModal = ({ 
  visible, 
  selectedUser, 
  selectedPlace,  // ADD THIS LINE
  onClose, 
  onSendInvite,
  userLocation,
  cafes,
  onRefreshPlaces,
  onLocationSelectionStart, // NEW: Callback when location selection starts
  onLocationSelectionEnd,   // NEW: Callback when location selection ends
  isLocationSelecting = false, // NEW: External state for location selection
  isMinimized = false         // NEW: External state for minimized mode
}) => {
  // Modal states
  const [isVisible, setIsVisible] = useState(false);
  const [invitationData, setInvitationData] = useState({
    luogo: null,
    data: '',
    ora: '',
    messaggio: ''
  });

  // Internal animation states
  const [isAnimatingToCorner, setIsAnimatingToCorner] = useState(false);
  const [isAnimatingToCenter, setIsAnimatingToCenter] = useState(false);
  const [showLocationPanel, setShowLocationPanel] = useState(false);

  // Location selection states
  const [locationSearch, setLocationSearch] = useState('');
  const [filteredCafes, setFilteredCafes] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Validation
  const [errors, setErrors] = useState({});

  // Animation handling
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!cafes) return;
    
    let filtered = cafes.filter(cafe => {
        // Search matching
        const matchesSearch = !locationSearch || 
        cafe.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (cafe.address && cafe.address.toLowerCase().includes(locationSearch.toLowerCase()));
        
        // Enhanced type detection - check multiple sources
        const placeType = (cafe.type || cafe.placeType || '').toLowerCase();
        const placeName = (cafe.name || '').toLowerCase();
        const googleTypes = cafe.types || []; // Google API types array
        
        // Check if it's a restaurant based on multiple criteria
        const isRestaurant = 
        placeType === 'restaurant' ||
        googleTypes.includes('restaurant') ||
        googleTypes.includes('meal_takeaway') ||
        googleTypes.includes('meal_delivery') ||
        placeName.includes('pizzeria') || placeName.includes('pizza') ||
        placeName.includes('ristorante') || placeName.includes('osteria') ||
        placeName.includes('trattoria') || placeName.includes('gelateria') ||
        placeName.includes('gelato') || placeName.includes('pasticceria') ||
        placeName.includes('dolc');
        
        // Check if it's a cafe/bar
        const isCafe = 
        placeType === 'cafe' ||
        googleTypes.includes('cafe') ||
        googleTypes.includes('bar') ||
        placeName.includes('bar') || placeName.includes('caffè') ||
        placeName.includes('caffe') || !isRestaurant; // default to cafe if not restaurant
        
        // Determine actual type
        let actualType = isRestaurant ? 'restaurant' : 'cafe';
        
        // Filter matching
        const matchesFilter = selectedFilter === 'all' || actualType === selectedFilter;
        
        return matchesSearch && matchesFilter;
    });

    // Sort by distance if available, then by rating
    filtered.sort((a, b) => {
        if (a.distance && b.distance) {
        return a.distance - b.distance;
        }
        if (a.rating && b.rating) {
        return b.rating - a.rating;
        }
        return 0;
    });

    setFilteredCafes(filtered);
    }, [cafes, locationSearch, selectedFilter]);

    // DEBUGGING - Add this temporarily
    console.log('🔍 DEBUGGING PLACES LIST:');
    console.log('Selected Filter:', selectedFilter);
    console.log('Total cafes from API:', cafes?.length);
    console.log('Filtered cafes:', filteredCafes?.length);

    // Log first 5 places to see their structure
    cafes?.slice(0, 5).forEach((cafe, index) => {
    console.log(`Place ${index + 1}:`, {
        name: cafe.name,
        type: cafe.type,
        placeType: cafe.placeType,
        rawTypes: cafe.types, // Google API types array
        address: cafe.address || cafe.vicinity
    });
    });

    // Log filtered results
    console.log('Filtered results:', filteredCafes?.map(cafe => ({
    name: cafe.name,
    type: cafe.type,
    detectedType: (() => {
        const placeType = (cafe.type || cafe.placeType || '').toLowerCase();
        const placeName = (cafe.name || '').toLowerCase();
        if (placeType === 'restaurant' || 
            placeName.includes('pizzeria') || placeName.includes('pizza') || 
            placeName.includes('ristorante') || placeName.includes('osteria') ||
            placeName.includes('trattoria')) {
        return 'restaurant';
        } else if (placeName.includes('gelateria') || placeName.includes('gelato')) {
        return 'restaurant';
        } else if (placeName.includes('pasticceria') || placeName.includes('dolc')) {
        return 'restaurant';
        } else {
        return 'cafe';
        }
    })()
    })));

  // Handle backdrop click (only when not minimized)
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isMinimized && !isLocationSelecting) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setInvitationData({ luogo: null, data: '', ora: '', messaggio: '' });
      setErrors({});
      setShowLocationPanel(false);
      setLocationSearch('');
      setSelectedFilter('all');
      onClose();
    }, 300);
  };

  // Handle location selection start
  const handleLocationSelectionStart = () => {
    console.log('📍 Starting location selection with animation');
    setIsAnimatingToCorner(true);
    
    // Start the animation sequence
    setTimeout(() => {
      setIsAnimatingToCorner(false);
      // Notify parent to switch to map mode and minimize modal
      if (onLocationSelectionStart) {
        onLocationSelectionStart();
      }
    }, 400);
  };

  // Handle location selection (called from parent when place is selected)
  const handleLocationSelected = (place) => {
    console.log('✅ InviteModal: Location selected:', place?.name);
    console.log('📍 Place data received:', place);
    
    try {
        // Update the invitation data with the selected place
        setInvitationData(prev => ({ 
        ...prev, 
        luogo: place 
        }));
        
        // Hide the location panel and show the main form
        setShowLocationPanel(false);
        setIsAnimatingToCenter(true);
        
        // Animate back to center
        setTimeout(() => {
        setIsAnimatingToCenter(false);
        if (onLocationSelectionEnd) {
            onLocationSelectionEnd();
        }
        }, 400);
        
        console.log('✅ Location successfully set in invitation data');
    } catch (error) {
        console.error('❌ Error in handleLocationSelected:', error);
    }
  };

  // Handle selecting place from list
  const handleSelectPlaceFromList = (place) => {
    console.log('📍 Place selected from list:', place.name);
    setInvitationData(prev => ({ ...prev, luogo: place }));
    setShowLocationPanel(false);
    setLocationSearch('');
  };

  // Expose method to parent for setting selected location
  useEffect(() => {
    window.setInvitationLocation = handleLocationSelected;
    return () => {
      delete window.setInvitationLocation;
    };
  }, []);

  // NEW: Handle when a place is selected from the map
  useEffect(() => {
    if (selectedPlace && !invitationData.luogo) {
        console.log('🎯 InviteModal: Received selected place from parent:', selectedPlace.name);
        handleLocationSelected(selectedPlace);
    }
  }, [selectedPlace, invitationData.luogo]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!invitationData.luogo) {
      newErrors.luogo = 'Seleziona un luogo per l\'incontro';
    }
    if (!invitationData.data) {
      newErrors.data = 'Seleziona una data';
    }
    if (!invitationData.ora) {
      newErrors.ora = 'Seleziona un orario';
    }
    if (!invitationData.messaggio.trim()) {
      newErrors.messaggio = 'Scrivi un messaggio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      onSendInvite({
        toUser: selectedUser,
        place: invitationData.luogo,
        date: invitationData.data,
        time: invitationData.ora,
        message: invitationData.messaggio
      });
      handleClose();
    }
  };

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  if (!visible || !selectedUser) return null;

  // Determine modal style based on state
  const getModalStyle = () => {
    if (isMinimized && !isAnimatingToCenter) {
        // NEW: When in location selection mode, position at top center
        if (isLocationSelecting) {
            return {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                maxWidth: '320px',
                height: 'auto',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 2500
            };
        }
        // Original minimized state - small card in corner (when NOT selecting location)
        return {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        maxWidth: '320px',
        height: 'auto',
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 2500
        };
    } else if (isAnimatingToCenter) {
      // Animating back to center
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '600px',
        maxWidth: '90vw',
        height: 'auto',
        transform: 'translate(-50%, -50%) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 3000
      };
    } else {
      // Normal centered modal
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '600px',
        maxWidth: '90vw',
        height: 'auto',
        transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.95})`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 3000
      };
    }
  };

  return (
    <>
      {/* Backdrop - only show when not minimized */}
      {(!isMinimized || isAnimatingToCenter) && (
        <div 
          className={`invitation-modal-backdrop ${isVisible ? 'visible' : ''}`}
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 2999
          }}
        />
      )}

      {/* Modal */}
      <div 
        className={`invitation-modal ${isVisible ? 'visible' : ''} ${isMinimized ? 'minimized' : ''}`}
        style={getModalStyle()}
      >
        
        {/* Header */}
        <div className="invitation-modal-header">
          {isMinimized ? (
            <button 
              className="btn-expand"
              onClick={() => {
                setIsAnimatingToCenter(true);
                setTimeout(() => {
                  setIsAnimatingToCenter(false);
                  if (onLocationSelectionEnd) {
                    onLocationSelectionEnd();
                  }
                }, 400);
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : null}
          
          <h3>
            {isMinimized 
              ? 'Seleziona luogo'
              : showLocationPanel 
                ? 'Seleziona il luogo'
                : `Invita ${selectedUser.firstName} per un caffè`
            }
          </h3>
          
          <button 
            className="btn-close-modal"
            onClick={handleClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimized Content */}
        {isMinimized && (
          <div className="minimized-content">
            <div className="minimized-info">
              <div className="minimized-text">
                Tocca sulla mappa per selezionare
              </div>
              {invitationData.luogo && (
                <div className="minimized-selected">
                  ✅ {invitationData.luogo.name}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Form Content - only show when not minimized */}
        {!isMinimized && (
          <>
            {showLocationPanel ? (
              // Location Selection Panel
              <div className="location-selection">
                <div className="search-header">
                  <div className="search-input-wrapper">
                    <Search className="search-icon w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Cerca un luogo..."
                      className="search-input-horizontal"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedFilter('all')}
                    >
                      Tutti
                    </button>
                    <button 
                      className={`filter-btn ${selectedFilter === 'cafe' ? 'active' : ''}`}
                      onClick={() => setSelectedFilter('cafe')}
                    >
                      ☕ Bar
                    </button>
                    <button 
                      className={`filter-btn ${selectedFilter === 'restaurant' ? 'active' : ''}`}
                      onClick={() => setSelectedFilter('restaurant')}
                    >
                      🍽️ Ristoranti
                    </button>
                  </div>
                </div>

                <div className="places-list-enhanced">
                    {filteredCafes.length > 0 ? (
                        filteredCafes.map((cafe, index) => {
                        // Enhanced place type detection
                        const placeType = (cafe.type || cafe.placeType || '').toLowerCase();
                        const placeName = (cafe.name || '').toLowerCase();
                        
                        // Determine display type and emoji
                        let displayType = 'Bar';
                        let emoji = '☕';
                        let typeColor = '#F97316';
                        
                        if (placeType === 'restaurant' || 
                            placeName.includes('pizzeria') || placeName.includes('pizza') || 
                            placeName.includes('ristorante') || placeName.includes('osteria') ||
                            placeName.includes('trattoria')) {
                            displayType = 'Ristorante';
                            emoji = '🍽️';
                            typeColor = '#EF4444';
                        } else if (placeName.includes('gelateria') || placeName.includes('gelato')) {
                            displayType = 'Gelateria';
                            emoji = '🍦';
                            typeColor = '#FF6B9D';
                        } else if (placeName.includes('pizzeria') || placeName.includes('pizza')) {
                            displayType = 'Pizzeria';
                            emoji = '🍕';
                            typeColor = '#FF8C42';
                        } else if (placeName.includes('pasticceria') || placeName.includes('dolc')) {
                            displayType = 'Pasticceria';
                            emoji = '🧁';
                            typeColor = '#FF69B4';
                        }

                        return (
                            <div key={cafe.id || index} className="place-card-enhanced">
                            
                            {/* Place Header */}
                            <div className="place-header">
                                <div className="place-emoji-container">
                                <div 
                                    className="place-emoji"
                                    style={{
                                    background: `linear-gradient(135deg, ${typeColor}, ${typeColor}dd)`,
                                    boxShadow: `0 4px 12px ${typeColor}40`
                                    }}
                                >
                                    {emoji}
                                </div>
                                </div>
                                
                                <div className="place-info-main">
                                <div className="place-name-row">
                                    <h3 className="place-name">{cafe.name}</h3>
                                    {cafe.rating && (
                                    <div className="place-rating">
                                        <span className="rating-stars">⭐</span>
                                        <span className="rating-value">{cafe.rating}</span>
                                    </div>
                                    )}
                                </div>
                                
                                <div className="place-address">{cafe.address || cafe.vicinity}</div>
                                
                                <div className="place-meta-row">
                                    <span 
                                    className="place-type-badge"
                                    style={{
                                        background: `${typeColor}20`,
                                        color: typeColor,
                                        border: `1px solid ${typeColor}30`
                                    }}
                                    >
                                    {displayType}
                                    </span>
                                    
                                    {cafe.formattedDistance && (
                                    <span className="place-distance">
                                        📍 {cafe.formattedDistance}
                                    </span>
                                    )}
                                    
                                    {cafe.priceLevel !== undefined && (
                                    <span className="place-price">
                                        {'€'.repeat(cafe.priceLevel + 1)}
                                    </span>
                                    )}
                                </div>
                                </div>
                            </div>

                            {/* Select Button */}
                            <button 
                                className="btn-select-place-enhanced"
                                onClick={() => handleSelectPlaceFromList(cafe)}
                                style={{
                                background: `linear-gradient(135deg, ${typeColor}, ${typeColor}dd)`,
                                boxShadow: `0 4px 12px ${typeColor}30`
                                }}
                                onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = `0 6px 20px ${typeColor}40`;
                                }}
                                onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = `0 4px 12px ${typeColor}30`;
                                }}
                            >
                                <span>Seleziona</span>
                                <span className="select-arrow">→</span>
                            </button>
                            </div>
                        );
                        })
                    ) : (
                        <div className="no-places-enhanced">
                        <div className="no-places-illustration">
                            <div className="empty-state-icon">🗺️</div>
                            <div className="empty-state-rings">
                            <div className="ring ring-1"></div>
                            <div className="ring ring-2"></div>
                            <div className="ring ring-3"></div>
                            </div>
                        </div>
                        <div className="no-places-content">
                            <h3 className="no-places-title">Nessun luogo trovato</h3>
                            <p className="no-places-description">
                            Prova a modificare i filtri o cerca un termine diverso
                            </p>
                        </div>
                        </div>
                    )}
                    </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <button 
                    className="btn-select-from-map"
                    onClick={handleLocationSelectionStart}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    Oppure seleziona dalla mappa
                  </button>
                </div>
              </div>
            ) : (
              // Main Form
              <div className="invitation-form">
                
                {/* User Info */}
                <div className="invite-user-info">
                  <div className="invite-user-avatar">
                    {selectedUser.profilePic ? (
                      <img src={selectedUser.profilePic} alt={selectedUser.firstName} />
                    ) : (
                      <div className="avatar-placeholder">
                        {selectedUser.firstName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="invite-user-details">
                    <div className="invite-user-name">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                    <div className="invite-user-distance">
                      📍 {selectedUser.distance 
                        ? selectedUser.distance < 1000 
                          ? `${Math.round(selectedUser.distance)}m di distanza`
                          : `${(selectedUser.distance / 1000).toFixed(1)}km di distanza`
                        : 'Nelle vicinanze'
                      }
                    </div>
                  </div>
                </div>

                {/* Location Selection */}
                <div className="form-section">
                  <label className="form-label">
                    <MapPin className="w-4 h-4" />
                    Luogo dell'incontro *
                  </label>
                  <button 
                    className={`location-select-btn ${errors.luogo ? 'error' : ''} ${invitationData.luogo ? 'selected' : ''}`}
                    onClick={() => setShowLocationPanel(true)}
                  >
                    {invitationData.luogo ? (
                      <div className="selected-location">
                        <div className="location-name">{invitationData.luogo.name}</div>
                        <div className="location-address">{invitationData.luogo.address}</div>
                      </div>
                    ) : (
                      <div className="placeholder">
                        Tocca per selezionare un luogo
                      </div>
                    )}
                    <MapPin className="w-5 h-5 location-icon" />
                  </button>
                  {errors.luogo && <div className="error-text">{errors.luogo}</div>}
                </div>

                {/* Date Selection */}
                <div className="form-section">
                  <label className="form-label">
                    <Calendar className="w-4 h-4" />
                    Data dell'incontro *
                  </label>
                  <input
                    type="date"
                    className={`form-input ${errors.data ? 'error' : ''}`}
                    value={invitationData.data}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, data: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.data && <div className="error-text">{errors.data}</div>}
                </div>

                {/* Time Selection */}
                <div className="form-section">
                  <label className="form-label">
                    <Clock className="w-4 h-4" />
                    Orario dell'incontro *
                  </label>
                  <select
                    className={`form-input ${errors.ora ? 'error' : ''}`}
                    value={invitationData.ora}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, ora: e.target.value }))}
                  >
                    <option value="">Seleziona un orario</option>
                    {generateTimeOptions().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  {errors.ora && <div className="error-text">{errors.ora}</div>}
                </div>

                {/* Message */}
                <div className="form-section">
                  <label className="form-label">
                    <MessageSquare className="w-4 h-4" />
                    Messaggio personale *
                  </label>
                  <textarea
                    className={`form-textarea ${errors.messaggio ? 'error' : ''}`}
                    placeholder="Scrivi un messaggio carino per l'invito..."
                    value={invitationData.messaggio}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, messaggio: e.target.value }))}
                    rows={4}
                  />
                  {errors.messaggio && <div className="error-text">{errors.messaggio}</div>}
                </div>

                {/* Actions */}
                <div className="form-actions">
                  <button 
                    className="btn-send-invite"
                    onClick={handleSubmit}
                  >
                    <Send className="w-4 h-4" />
                    Invia Invito
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default InviteModal;