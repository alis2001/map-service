// Enhanced Invitation Modal - Complete Italian System with Animation States
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
      onClose();
    }, 300);
  };

  // Handle location selection start
  const handleLocationSelectionStart = () => {
    setIsAnimatingToCorner(true);
    setTimeout(() => {
      setIsAnimatingToCorner(false);
      onLocationSelectionStart && onLocationSelectionStart();
    }, 400);
  };

  // Handle location selection (called from parent when place is selected)
  const handleLocationSelected = (place) => {
    setInvitationData(prev => ({ ...prev, luogo: place }));
    setIsAnimatingToCenter(true);
    setTimeout(() => {
      setIsAnimatingToCenter(false);
      onLocationSelectionEnd && onLocationSelectionEnd();
    }, 400);
  };

  // Expose method to parent for setting selected location
  useEffect(() => {
    if (window.setInvitationLocation) {
      window.setInvitationLocation = handleLocationSelected;
    }
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
        width: '300px',
        maxWidth: '300px',
        height: 'auto',
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        zIndex: 2500
      };
    } else if (isAnimatingToCorner) {
      // Animating to corner
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '300px',
        maxWidth: '300px',
        height: 'auto',
        transform: `translate(-50%, -50%) scale(0.8)`,
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
        maxWidth: '600px',
        height: 'auto',
        transform: `translate(-50%, -50%) scale(1)`,
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
        maxWidth: '600px',
        height: 'auto',
        transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.95})`,
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
            backdropFilter: 'blur(12px)',
            zIndex: 2999,
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.4s ease',
            pointerEvents: isVisible ? 'auto' : 'none'
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
          {isMinimized && (
            <button 
              className="btn-expand"
              onClick={() => onLocationSelectionEnd && onLocationSelectionEnd()}
              title="Espandi invito"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <h3>
            {isMinimized 
              ? `Invito per ${selectedUser.firstName}` 
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

        {/* Content - Hide most content when minimized */}
        {!isMinimized && (
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
                onClick={handleLocationSelectionStart}
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
                Messaggio personalizzato *
              </label>
              <textarea
                className={`form-textarea ${errors.messaggio ? 'error' : ''}`}
                placeholder="Scrivi un messaggio per l'invito..."
                value={invitationData.messaggio}
                onChange={(e) => setInvitationData(prev => ({ ...prev, messaggio: e.target.value }))}
                rows={4}
              />
              {errors.messaggio && <div className="error-text">{errors.messaggio}</div>}
            </div>

            {/* Submit Button */}
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

        {/* Minimized content */}
        {isMinimized && (
          <div className="minimized-content">
            <div className="minimized-info">
              <div className="minimized-text">Seleziona luogo sulla mappa</div>
              {invitationData.luogo && (
                <div className="minimized-selected">
                  ✅ {invitationData.luogo.name}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InviteModal;
  // Modal states
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState('form'); // 'form' | 'location' 
  const [invitationData, setInvitationData] = useState({
    luogo: null,
    data: '',
    ora: '',
    messaggio: ''
  });

  // Location selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [cafeType, setCafeType] = useState('cafe');
  const [showInvitationsInCorso, setShowInvitationsInCorso] = useState(false);

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

  // Filter places based on search and type
  useEffect(() => {
    if (!cafes || cafes.length === 0) return;
    
    let filtered = cafes.filter(place => {
      const matchesType = place.type?.toLowerCase() === cafeType.toLowerCase() || 
                         place.placeType?.toLowerCase() === cafeType.toLowerCase();
      const matchesSearch = !searchQuery || 
                           place.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           place.address?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
    
    setFilteredPlaces(filtered);
  }, [cafes, searchQuery, cafeType]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentStep('form');
      setInvitationData({ luogo: null, data: '', ora: '', messaggio: '' });
      setSelectedPlace(null);
      setErrors({});
      onClose();
    }, 300);
  };

  // Handle location selection
  const handleLocationSelect = (place) => {
    setSelectedPlace(place);
    setInvitationData(prev => ({ ...prev, luogo: place }));
    setCurrentStep('form');
  };

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

  return (
    <div 
      className={`invitation-modal-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`invitation-modal ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="invitation-modal-header">
          {currentStep === 'location' && (
            <button 
              className="btn-back"
              onClick={() => setCurrentStep('form')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h3>
            {currentStep === 'form' 
              ? `Invita ${selectedUser.firstName} per un caffè` 
              : 'Seleziona il luogo'
            }
          </h3>
          <button 
            className="btn-close-modal"
            onClick={handleClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Step */}
        {currentStep === 'form' && (
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
                onClick={() => setCurrentStep('location')}
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
                Messaggio personalizzato *
              </label>
              <textarea
                className={`form-textarea ${errors.messaggio ? 'error' : ''}`}
                placeholder="Scrivi un messaggio per l'invito..."
                value={invitationData.messaggio}
                onChange={(e) => setInvitationData(prev => ({ ...prev, messaggio: e.target.value }))}
                rows={4}
              />
              {errors.messaggio && <div className="error-text">{errors.messaggio}</div>}
            </div>

            {/* Submit Button */}
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

        {/* Location Selection Step */}
        {currentStep === 'location' && (
          <div className="location-selection">
            
            {/* Search and Filter Header */}
            <div className="search-header">
              <div className="search-input-wrapper">
                <Search className="w-4 h-4 search-icon" />
                <input
                  type="text"
                  placeholder="Cerca caffè, bar, ristoranti..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-horizontal"
                />
              </div>
              
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${cafeType === 'cafe' ? 'active' : ''}`}
                  onClick={() => setCafeType('cafe')}
                >
                  ☕ Caffè
                </button>
                <button 
                  className={`filter-btn ${cafeType === 'restaurant' ? 'active' : ''}`}
                  onClick={() => setCafeType('restaurant')}
                >
                  🍽️ Ristoranti
                </button>
              </div>
            </div>

            {/* Places List */}
            <div className="places-list">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place, index) => (
                  <div key={place.id || index} className="place-card-selectable">
                    <div className="place-info">
                      <div className="place-name">{place.name}</div>
                      <div className="place-address">{place.address}</div>
                      <div className="place-meta">
                        {place.rating && (
                          <span className="rating">⭐ {place.rating}</span>
                        )}
                        {place.distance && (
                          <span className="distance">
                            📍 {place.distance < 1000 
                              ? `${Math.round(place.distance)}m`
                              : `${(place.distance / 1000).toFixed(1)}km`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="btn-select-place"
                      onClick={() => handleLocationSelect(place)}
                    >
                      Seleziona
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-places">
                  <div className="no-places-icon">🔍</div>
                  <div className="no-places-text">
                    Nessun luogo trovato
                  </div>
                  <div className="no-places-subtext">
                    Prova a cambiare i filtri di ricerca
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteModal;