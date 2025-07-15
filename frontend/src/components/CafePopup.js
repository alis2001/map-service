// components/CafePopup.js - COMPLETE ENHANCED VERSION with Apple WWDC 2025 Design
// Location: /map-service/frontend/src/components/CafePopup.js

import React, { useState, useEffect } from 'react';
import { usePlaceDetails } from '../hooks/useCafes';

const CafePopup = ({ cafe, onClose, userLocation }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('entering');
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

  // 🎬 Enhanced Animation on mount
  useEffect(() => {
    // Phase 1: Scale and fade in
    setTimeout(() => setAnimationPhase('phase1'), 50);
    
    // Phase 2: Bounce effect  
    setTimeout(() => setAnimationPhase('phase2'), 200);
    
    // Phase 3: Final settle with glow
    setTimeout(() => {
      setAnimationPhase('visible');
      setIsVisible(true);
    }, 350);
    
    return () => {};
  }, []);

  const handleClose = () => {
    setAnimationPhase('exiting');
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 400);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ENHANCED: Enhanced venue info function with gradients and colors
  const getEnhancedVenueInfo = (venue) => {
    const type = venue.type || venue.placeType || 'cafe';
    const name = (venue.name || '').toLowerCase();
    
    // Enhanced venue detection with Italian specialties
    if (name.includes('gelateria') || name.includes('gelato')) {
      return { 
        type: 'gelateria', 
        emoji: '🍦', 
        gradient: 'linear-gradient(135deg, #FF6B9D, #C084FC)',
        label: 'Gelateria',
        color: '#FF6B9D'
      };
    }
    if (name.includes('pizzeria') || name.includes('pizza')) {
      return { 
        type: 'pizzeria', 
        emoji: '🍕', 
        gradient: 'linear-gradient(135deg, #FF8C42, #F97316)',
        label: 'Pizzeria',
        color: '#FF8C42'
      };
    }
    if (name.includes('pasticceria') || name.includes('dolc')) {
      return { 
        type: 'pasticceria', 
        emoji: '🧁', 
        gradient: 'linear-gradient(135deg, #FF69B4, #EC4899)',
        label: 'Pasticceria',
        color: '#FF69B4'
      };
    }
    if (name.includes('panetteria') || name.includes('pane')) {
      return { 
        type: 'panetteria', 
        emoji: '🥖', 
        gradient: 'linear-gradient(135deg, #D2691E, #B45309)',
        label: 'Panetteria',
        color: '#D2691E'
      };
    }
    
    switch (type) {
      case 'restaurant':
        return { 
          type: 'restaurant', 
          emoji: '🍽️', 
          gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
          label: 'Ristorante',
          color: '#EF4444'
        };
      case 'cafe':
      default:
        return { 
          type: 'cafe', 
          emoji: '☕', 
          gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
          label: 'Caffetteria',
          color: '#F97316'
        };
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

  // 🎨 ENHANCED LIQUID GLASS POPUP STYLES
  const getPopupStyles = () => {
    const baseStyles = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      zIndex: 10000,
      maxWidth: '420px',
      width: '90vw',
      maxHeight: '85vh',
      borderRadius: '28px',
      overflow: 'hidden',
      // ENHANCED LIQUID GLASS EFFECT - Apple WWDC 2025 Style
      background: `
        linear-gradient(135deg,
          rgba(255, 255, 255, 0.95) 0%,
          rgba(255, 255, 255, 0.92) 25%,
          rgba(248, 250, 252, 0.95) 50%,
          rgba(241, 245, 249, 0.92) 75%,
          rgba(255, 255, 255, 0.95) 100%
        )
      `,
      backdropFilter: 'blur(40px) saturate(180%) brightness(110%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(110%)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      // MULTI-LAYERED SHADOWS - Apple style depth
      boxShadow: `
        0 32px 64px rgba(0, 0, 0, 0.15),
        0 16px 32px rgba(0, 0, 0, 0.10),
        0 8px 16px rgba(0, 0, 0, 0.08),
        0 4px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        inset 0 -1px 0 rgba(255, 255, 255, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.2)
      `,
      // ENHANCED TRANSITIONS
      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };

    // ENHANCED ANIMATION PHASES
    switch (animationPhase) {
      case 'entering':
        return {
          ...baseStyles,
          transform: 'translate(-50%, -50%) scale(0.4) rotateX(-20deg) rotateY(15deg) rotateZ(-2deg)',
          opacity: 0,
          filter: 'blur(15px) brightness(0.6) saturate(150%)',
          backdropFilter: 'blur(0px)'
        };
      case 'phase1':
        return {
          ...baseStyles,
          transform: 'translate(-50%, -50%) scale(0.85) rotateX(-8deg) rotateY(4deg) rotateZ(-1deg)',
          opacity: 0.7,
          filter: 'blur(6px) brightness(0.85) saturate(140%)',
          backdropFilter: 'blur(20px) saturate(140%)'
        };
      case 'phase2':
        return {
          ...baseStyles,
          transform: 'translate(-50%, -50%) scale(1.03) rotateX(-2deg) rotateY(1deg) rotateZ(0deg)',
          opacity: 0.95,
          filter: 'blur(1px) brightness(1.05) saturate(120%)',
          backdropFilter: 'blur(35px) saturate(160%)'
        };
      case 'visible':
      default:
        return {
          ...baseStyles,
          transform: 'translate(-50%, -50%) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
          opacity: 1,
          filter: 'blur(0px) brightness(1) saturate(110%)',
          backdropFilter: 'blur(40px) saturate(180%) brightness(110%)'
        };
    }
  };

  // 🌟 ENHANCED OVERLAY WITH DYNAMIC BLUR
  const getOverlayStyles = () => {
    const baseStyles = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    switch (animationPhase) {
      case 'entering':
        return {
          ...baseStyles,
          background: 'rgba(0, 0, 0, 0)',
          backdropFilter: 'blur(0px)',
          WebkitBackdropFilter: 'blur(0px)'
        };
      case 'phase1':
        return {
          ...baseStyles,
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        };
      case 'phase2':
      case 'visible':
      default:
        return {
          ...baseStyles,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)'
        };
    }
  };

  // ✨ ENHANCED ELEMENT ANIMATIONS
  const getElementAnimation = (delay = 0, type = 'slideUp') => {
    const isVisible = animationPhase === 'visible' || animationPhase === 'phase2';
    
    const animations = {
      slideUp: {
        transform: isVisible ? 'translateY(0px) scale(1)' : 'translateY(40px) scale(0.95)',
        opacity: isVisible ? 1 : 0
      },
      slideLeft: {
        transform: isVisible ? 'translateX(0px) scale(1)' : 'translateX(-30px) scale(0.95)',
        opacity: isVisible ? 1 : 0
      },
      slideRight: {
        transform: isVisible ? 'translateX(0px) scale(1)' : 'translateX(30px) scale(0.95)',
        opacity: isVisible ? 1 : 0
      },
      scale: {
        transform: isVisible ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
        opacity: isVisible ? 1 : 0
      },
      rotate: {
        transform: isVisible ? 'rotate(0deg) scale(1)' : 'rotate(-15deg) scale(0.85)',
        opacity: isVisible ? 1 : 0
      },
      fadeIn: {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)'
      },
      bounce: {
        transform: isVisible ? 'translateY(0px) scale(1)' : 'translateY(-20px) scale(0.9)',
        opacity: isVisible ? 1 : 0
      }
    };
    
    return {
      ...animations[type],
      transition: `all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
    };
  };

  const venueInfo = getEnhancedVenueInfo(placeData);

  return (
    <div 
      className={`popup-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
      style={getOverlayStyles()}
    >
      <div 
        className={`cafe-popup ${isVisible ? 'visible' : ''}`}
        style={getPopupStyles()}
      >
        
        {/* 🎨 ENHANCED APPLE WWDC 2025 HEADER */}
        <div 
          style={{
            position: 'relative',
            background: `
              linear-gradient(135deg,
                ${venueInfo.color}20 0%,
                rgba(255, 255, 255, 0.95) 25%,
                rgba(248, 250, 252, 0.98) 100%
              )
            `,
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '28px 24px',
            overflow: 'hidden',
            ...getElementAnimation(100, 'slideUp')
          }}
        >
          {/* Animated Background Particles */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 30%, ${venueInfo.color}20 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, ${venueInfo.color}15 0%, transparent 50%)
            `,
            opacity: 0.6,
            animation: 'headerParticles 8s ease-in-out infinite'
          }} />

          {/* Main Header Content */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}>
            
            {/* Left Content */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
              
              {/* Enhanced Emoji with Glass Effect */}
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '24px',
                  background: `
                    linear-gradient(135deg,
                      rgba(255, 255, 255, 0.9) 0%,
                      rgba(255, 255, 255, 0.7) 100%
                    )
                  `,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  boxShadow: `
                    0 16px 32px rgba(0, 0, 0, 0.1),
                    0 8px 16px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8),
                    0 0 0 1px rgba(255, 255, 255, 0.2)
                  `,
                  transform: 'translateZ(0)',
                  ...getElementAnimation(200, 'rotate')
                }}
              >
                {venueInfo.emoji}
              </div>

              {/* Text Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                
                {/* Venue Name */}
                <h2 
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1F2937',
                    margin: '0 0 8px 0',
                    lineHeight: '1.2',
                    background: `
                      linear-gradient(135deg,
                        #1F2937 0%,
                        ${venueInfo.color} 100%
                      )
                    `,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    ...getElementAnimation(300, 'slideLeft')
                  }}
                >
                  {placeData.name}
                </h2>

                {/* Venue Meta */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    ...getElementAnimation(400, 'slideLeft')
                  }}
                >
                  
                  {/* Venue Type Badge */}
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    background: `
                      linear-gradient(135deg,
                        ${venueInfo.color}20 0%,
                        ${venueInfo.color}10 100%
                      )
                    `,
                    border: `1px solid ${venueInfo.color}30`,
                    fontSize: '13px',
                    fontWeight: '600',
                    color: venueInfo.color,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}>
                    {venueInfo.label}
                  </div>

                  {/* Distance Badge */}
                  {placeData.distance && (
                    <>
                      <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#9CA3AF'
                      }} />
                      
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#3B82F6',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                      }}>
                        📍 {placeData.formattedDistance || `${Math.round(placeData.distance)}m`}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Close Button */}
            <button 
              onClick={handleClose}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                border: 'none',
                background: `
                  linear-gradient(135deg,
                    rgba(255, 255, 255, 0.9) 0%,
                    rgba(248, 250, 252, 0.8) 100%
                  )
                `,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '600',
                boxShadow: `
                  0 8px 16px rgba(0, 0, 0, 0.1),
                  0 4px 8px rgba(0, 0, 0, 0.06),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8)
                `,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'translateZ(0)',
                ...getElementAnimation(500, 'scale')
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05) translateZ(0)';
                e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 250, 252, 0.9) 100%)';
                e.target.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1) translateZ(0)';
                e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)';
                e.target.style.color = '#6B7280';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 🎨 ENHANCED QUICK STATS */}
        <div 
          style={{
            display: 'flex',
            gap: '16px',
            padding: '20px 24px',
            background: `
              linear-gradient(135deg,
                rgba(255, 255, 255, 0.8) 0%,
                rgba(248, 250, 252, 0.9) 100%
              )
            `,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            ...getElementAnimation(200, 'slideUp')
          }}
        >
          {placeData.rating && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px',
                borderRadius: '16px',
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                minWidth: '70px',
                ...getElementAnimation(250, 'scale')
              }}
            >
              <span style={{ fontSize: '20px' }}>⭐</span>
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#1F2937' }}>{placeData.rating}</span>
              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>rating</span>
            </div>
          )}
          
          {placeData.priceLevel !== undefined && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px',
                borderRadius: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                minWidth: '70px',
                ...getElementAnimation(300, 'scale')
              }}
            >
              <span style={{ fontSize: '20px' }}>💰</span>
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#1F2937' }}>{'€'.repeat(placeData.priceLevel + 1)}</span>
              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>prezzo</span>
            </div>
          )}
          
          {/* ENHANCED: Dynamic Opening Status */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '12px',
              borderRadius: '16px',
              background: `rgba(${openingStatus.statusColor === '#10B981' ? '16, 185, 129' : openingStatus.statusColor === '#EF4444' ? '239, 68, 68' : '107, 114, 128'}, 0.1)`,
              border: `1px solid ${openingStatus.statusColor}30`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              flex: 1,
              minWidth: '100px',
              ...getElementAnimation(350, 'scale')
            }}
          >
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: openingStatus.statusColor,
                animation: openingStatus.isOpen === true ? 'successPulse 1.5s ease-in-out infinite' : 'none'
              }}
            />
            <span 
              style={{
                fontWeight: '700',
                fontSize: '12px',
                color: openingStatus.statusColor,
                textAlign: 'center',
                lineHeight: '1.2'
              }}
            >
              {openingStatus.status}
            </span>
            {openingStatus.confidence === 'high' && (
              <span style={{ color: '#10B981', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
            )}
          </div>
        </div>

        {/* 🎨 ENHANCED TABS */}
        <div 
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            ...getElementAnimation(300, 'slideUp')
          }}
        >
          <button 
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'info' ? `
                linear-gradient(135deg,
                  ${venueInfo.color}15 0%,
                  rgba(255, 255, 255, 0.9) 100%
                )
              ` : 'transparent',
              color: activeTab === 'info' ? venueInfo.color : '#6B7280',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderBottom: activeTab === 'info' ? `2px solid ${venueInfo.color}` : '2px solid transparent',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              ...getElementAnimation(350, 'scale')
            }}
          >
            📍 Info
          </button>
          <button 
            onClick={() => setActiveTab('hours')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'hours' ? `
                linear-gradient(135deg,
                  ${venueInfo.color}15 0%,
                  rgba(255, 255, 255, 0.9) 100%
                )
              ` : 'transparent',
              color: activeTab === 'hours' ? venueInfo.color : '#6B7280',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderBottom: activeTab === 'hours' ? `2px solid ${venueInfo.color}` : '2px solid transparent',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              ...getElementAnimation(400, 'scale')
            }}
          >
            🕒 Orari
          </button>
          {placeData.photos && placeData.photos.length > 0 && (
            <button 
              onClick={() => setActiveTab('photos')}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                background: activeTab === 'photos' ? `
                  linear-gradient(135deg,
                    ${venueInfo.color}15 0%,
                    rgba(255, 255, 255, 0.9) 100%
                  )
                ` : 'transparent',
                color: activeTab === 'photos' ? venueInfo.color : '#6B7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                borderBottom: activeTab === 'photos' ? `2px solid ${venueInfo.color}` : '2px solid transparent',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                ...getElementAnimation(450, 'scale')
              }}
            >
              📸 Foto
            </button>
          )}
        </div>

        {/* Content */}
        <div 
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '24px',
            ...getElementAnimation(400, 'slideUp')
          }}
        >
          
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                  ...getElementAnimation(450, 'slideLeft')
                }}
              >
                <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>📍</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Indirizzo</div>
                  <div style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500', lineHeight: '1.4' }}>{placeData.address}</div>
                </div>
              </div>

              {placeData.phoneNumber && (
                <div 
                  onClick={handleCall}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    ...getElementAnimation(500, 'slideLeft')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  }}
                >
                  <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>📞</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Telefono</div>
                    <div style={{ fontSize: '15px', color: '#3B82F6', fontWeight: '500', lineHeight: '1.4' }}>{placeData.phoneNumber}</div>
                  </div>
                </div>
              )}

              {placeData.website && (
                <div 
                  onClick={handleWebsite}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(34, 197, 94, 0.05)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    ...getElementAnimation(550, 'slideLeft')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)';
                  }}
                >
                  <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>🌐</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Sito web</div>
                    <div style={{ fontSize: '15px', color: '#22C55E', fontWeight: '500', lineHeight: '1.4' }}>Visita sito</div>
                  </div>
                </div>
              )}

              {placeData.priceLevel !== undefined && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                    ...getElementAnimation(600, 'slideLeft')
                  }}
                >
                  <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>💰</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Fascia di prezzo</div>
                    <div style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500', lineHeight: '1.4' }}>{getPriceLevelText(placeData.priceLevel)}</div>
                  </div>
                </div>
              )}

              <div 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: `rgba(${venueInfo.color.replace('#', '')}, 0.05)`.replace('rgba(', 'rgba(').replace(', 0.05)', ', 0.05)'),
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${venueInfo.color}30`,
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                  ...getElementAnimation(650, 'slideLeft')
                }}
              >
                <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>
                  {venueInfo.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Tipo di locale</div>
                  <div style={{ fontSize: '15px', color: venueInfo.color, fontWeight: '500', lineHeight: '1.4' }}>
                    {venueInfo.label}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ENHANCED Hours Tab with Dynamic Status */}
          {activeTab === 'hours' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Dynamic Status Header */}
              <div 
                style={{
                  background: `rgba(${openingStatus.statusColor === '#10B981' ? '16, 185, 129' : openingStatus.statusColor === '#EF4444' ? '239, 68, 68' : '107, 114, 128'}, 0.1)`,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `2px solid ${openingStatus.statusColor}30`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  ...getElementAnimation(450, 'scale')
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  <span style={{ fontSize: '24px' }}>
                    {openingStatus.isOpen === null ? '❓' : 
                     openingStatus.isOpen ? '🟢' : '🔴'}
                  </span>
                  <span style={{ color: openingStatus.statusColor }}>{openingStatus.status}</span>
                </div>
                
                {openingStatus.nextChange && (
                  <div style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    {openingStatus.nextChange.action === 'closes' ? 
                      'Chiude' : 'Apre'} {openingStatus.nextChange.timeText || openingStatus.nextChange.time}
                  </div>
                )}
                
                <div style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  fontStyle: 'italic'
                }}>
                  Aggiornato: {currentTime.toLocaleTimeString('it-IT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              
              {detailsLoading ? (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    ...getElementAnimation(500, 'fadeIn')
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #E5E7EB',
                    borderTop: '2px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>Caricamento orari...</span>
                </div>
              ) : (
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    ...getElementAnimation(500, 'slideUp')
                  }}
                >
                  {formatOpeningHours(placeData.openingHours).map((day, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        ...getElementAnimation(550 + (index * 50), 'slideLeft')
                      }}
                    >
                      <span style={{ fontWeight: '600', color: '#1F2937', fontSize: '14px' }}>
                        {day.split(':')[0]}
                      </span>
                      <span style={{ color: '#6B7280', fontSize: '14px' }}>
                        {day.split(':').slice(1).join(':')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && placeData.photos && (
            <div>
              {detailsLoading ? (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    ...getElementAnimation(450, 'fadeIn')
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #E5E7EB',
                    borderTop: '2px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>Caricamento foto...</span>
                </div>
              ) : (
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '12px',
                    ...getElementAnimation(450, 'slideUp')
                  }}
                >
                  {placeData.photoUrls?.medium?.slice(0, 6).map((photoUrl, index) => (
                    <div 
                      key={index}
                      style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        aspectRatio: '1',
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        ...getElementAnimation(500 + (index * 100), 'scale')
                      }}
                    >
                      <img 
                        src={photoUrl} 
                        alt={`${placeData.name} - Foto ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )) || (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: '#6B7280',
                        fontSize: '14px',
                        ...getElementAnimation(500, 'fadeIn')
                      }}
                    >
                      📸 Foto non disponibili
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🎨 ENHANCED ACTION BUTTONS */}
        <div 
          style={{
            display: 'flex',
            gap: '12px',
            padding: '24px',
            background: `
              linear-gradient(135deg,
                rgba(255, 255, 255, 0.8) 0%,
                rgba(248, 250, 252, 0.9) 100%
              )
            `,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            ...getElementAnimation(500, 'slideUp')
          }}
        >
          <button 
            onClick={handleDirections}
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '16px',
              border: 'none',
              background: venueInfo.gradient,
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: `0 8px 16px ${venueInfo.color}40`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              ...getElementAnimation(550, 'scale')
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px) scale(1.02)';
              e.target.style.boxShadow = `0 12px 24px ${venueInfo.color}50`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = `0 8px 16px ${venueInfo.color}40`;
            }}
          >
            🧭 Indicazioni
          </button>
          
          {placeData.phoneNumber && (
            <button 
              onClick={handleCall}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#374151',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...getElementAnimation(600, 'scale')
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                e.target.style.color = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                e.target.style.color = '#374151';
              }}
            >
              📞 Chiama
            </button>
          )}
          
          {placeData.website && (
            <button 
              onClick={handleWebsite}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#374151',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...getElementAnimation(650, 'scale')
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.background = 'rgba(34, 197, 94, 0.1)';
                e.target.style.color = '#22C55E';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                e.target.style.color = '#374151';
              }}
            >
              🌐 Sito
            </button>
          )}
        </div>

        {/* Italian venue tips */}
        <div 
          style={{
            background: `rgba(${venueInfo.color.slice(1).match(/.{2}/g).map(hex => parseInt(hex, 16)).join(', ')}, 0.05)`,
            margin: '0 24px 24px 24px',
            padding: '16px',
            borderRadius: '16px',
            fontSize: '13px',
            color: '#6B7280',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${venueInfo.color}20`,
            ...getElementAnimation(600, 'slideUp')
          }}
        >
          <div style={{ fontWeight: '700', marginBottom: '8px', color: venueInfo.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💡 Consiglio locale
          </div>
          {(placeData.type || placeData.placeType) === 'cafe' && 
            'I bar italiani servono caffè eccellente e aperitivi dalle 18:00.'
          }
          {(placeData.type || placeData.placeType) === 'restaurant' && 
            'I ristoranti italiani spesso aprono alle 19:30 per cena.'
          }
          {venueInfo.type === 'gelateria' && 
            'Le gelaterie italiane offrono gelato artigianale fresco ogni giorno.'
          }
          {venueInfo.type === 'pizzeria' && 
            'Le pizzerie napoletane servono pizza autentica con ingredienti freschi.'
          }
          {venueInfo.type === 'pasticceria' && 
            'Le pasticcerie italiane preparano dolci freschi ogni mattina.'
          }
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style jsx>{`
        @keyframes headerParticles {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
          }
          33% { 
            transform: translateY(-10px) rotate(2deg);
            opacity: 0.8;
          }
          66% { 
            transform: translateY(5px) rotate(-1deg);
            opacity: 0.4;
          }
        }

        @keyframes successPulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% { 
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom scrollbar for content area */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        /* Enhanced button hover effects */
        button {
          position: relative;
          overflow: hidden;
        }

        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        button:hover::before {
          left: 100%;
        }

        /* Glass morphism effects */
        .glass-effect {
          backdrop-filter: blur(20px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(110%);
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.7) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        /* Enhanced focus states for accessibility */
        button:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 480px) {
          .popup-content {
            padding: 16px;
          }
          
          .enhanced-header {
            padding: 20px 16px;
          }
          
          .venue-emoji {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }
          
          .venue-name {
            font-size: 20px;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .action-button {
            width: 100%;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .popup-overlay {
            background: rgba(0, 0, 0, 0.6);
          }
          
          .glass-effect {
            background: linear-gradient(135deg,
              rgba(31, 41, 55, 0.9) 0%,
              rgba(31, 41, 55, 0.7) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .popup-card {
            border: 2px solid currentColor;
          }
          
          .venue-badge {
            border: 1px solid currentColor;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CafePopup;