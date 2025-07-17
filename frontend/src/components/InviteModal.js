// Enhanced Invitation Modal - Complete with Location Selection Animation
// Location: /frontend/src/components/InviteModal.js

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar, Clock, MessageSquare, Send, ArrowLeft, Search, Filter, Minimize2, Maximize2 } from 'lucide-react';

const InviteModal = ({ 
  visible, 
  selectedUser, 
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

  // Filter cafes based on search and filter
  useEffect(() => {
    if (!cafes) return;
    
    let filtered = cafes.filter(cafe => {
      const matchesSearch = !locationSearch || 
        cafe.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (cafe.address && cafe.address.toLowerCase().includes(locationSearch.toLowerCase()));
      
      const matchesFilter = selectedFilter === 'all' || 
        (cafe.type || cafe.placeType || '').toLowerCase() === selectedFilter.toLowerCase();
      
      return matchesSearch && matchesFilter;
    });

    setFilteredCafes(filtered);
  }, [cafes, locationSearch, selectedFilter]);

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
    console.log('✅ Location selected:', place.name);
    setInvitationData(prev => ({ ...prev, luogo: place }));
    setIsAnimatingToCenter(true);
    
    // Animate back to center
    setTimeout(() => {
      setIsAnimatingToCenter(false);
      if (onLocationSelectionEnd) {
        onLocationSelectionEnd();
      }
    }, 400);
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
      // Minimized state - small card in corner
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
    } else if (isAnimatingToCorner) {
      // Animating to corner
      return {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        maxWidth: '320px',
        height: 'auto',
        transform: 'scale(0.85)',
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

                <div className="places-list">
                  {filteredCafes.length > 0 ? (
                    filteredCafes.map((cafe, index) => (
                      <div key={cafe.id || index} className="place-card-selectable">
                        <div className="place-info">
                          <div className="place-name">{cafe.name}</div>
                          <div className="place-address">{cafe.address || cafe.vicinity}</div>
                          <div className="place-meta">
                            {cafe.rating && (
                              <span className="rating">⭐ {cafe.rating}</span>
                            )}
                            {cafe.formattedDistance && (
                              <span className="distance">{cafe.formattedDistance}</span>
                            )}
                          </div>
                        </div>
                        <button 
                          className="btn-select-place"
                          onClick={() => handleSelectPlaceFromList(cafe)}
                        >
                          Seleziona
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-places">
                      <div className="no-places-icon">📍</div>
                      <div className="no-places-text">Nessun luogo trovato</div>
                      <div className="no-places-subtext">Prova a cercare o seleziona dalla mappa</div>
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