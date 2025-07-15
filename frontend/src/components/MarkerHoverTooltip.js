// components/MarkerHoverTooltip.js - VERSIONE CON SUPPORTO UTENTI
// Location: /frontend/src/components/MarkerHoverTooltip.js

import React, { useEffect, useState } from 'react';

const MarkerHoverTooltip = ({ 
  cafe, 
  user, // NUOVO: supporto utenti
  isVisible, 
  position = { x: 0, y: 0 },
  onClose 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle visibility changes with smooth animations
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  // NUOVO: Determina se stiamo mostrando un utente o un caffè
  const isUserTooltip = !!user;
  const data = isUserTooltip ? user : cafe;

  // Get color gradient based on cafe type and rating OR user status
  const getGradientColors = (data) => {
    if (isUserTooltip) {
      // Colori per utenti basati su stato online
      if (user.isLive) {
        const timeDiff = new Date() - new Date(user.lastSeen);
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        
        if (minutesAgo < 5) {
          // Online ora - verde
          return { primary: '#10B981', secondary: '#059669', accent: '#34D399' };
        }
        if (minutesAgo < 15) {
          // Attivo di recente - giallo
          return { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' };
        }
      }
      // Offline - grigio
      return { primary: '#6B7280', secondary: '#4B5563', accent: '#9CA3AF' };
    } else {
      // Logica esistente per caffè
      const type = (cafe.type || cafe.placeType || '').toLowerCase();
      const rating = cafe.rating || 0;
      
      if (type.includes('restaurant') || type.includes('ristorante')) {
        if (rating >= 4.5) return { primary: '#FF6B6B', secondary: '#FF8E53', accent: '#FFB84D' };
        if (rating >= 4.0) return { primary: '#FF8E53', secondary: '#FFB84D', accent: '#FFCC70' };
        return { primary: '#FFB84D', secondary: '#FFCC70', accent: '#FFE5B4' };
      } else {
        // Cafe/Bar
        if (rating >= 4.5) return { primary: '#4ECDC4', secondary: '#44A08D', accent: '#096C5D' };
        if (rating >= 4.0) return { primary: '#44A08D', secondary: '#096C5D', accent: '#6BB6FF' };
        return { primary: '#6BB6FF', secondary: '#74B9FF', accent: '#A29BFE' };
      }
    }
  };

  // Get appropriate emoji based on type OR user status
  const getEmoji = (data) => {
    if (isUserTooltip) {
      if (user.isLive) {
        const timeDiff = new Date() - new Date(user.lastSeen);
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        
        if (minutesAgo < 5) return '🟢'; // Online ora
        if (minutesAgo < 15) return '🟡'; // Attivo di recente
      }
      return '⚫'; // Offline
    } else {
      // Logica esistente per caffè
      const type = (cafe.type || cafe.placeType || '').toLowerCase();
      if (type.includes('restaurant') || type.includes('ristorante')) return '🍽️';
      if (type.includes('pizzeria')) return '🍕';
      if (type.includes('bar') && !type.includes('restaurant')) return '🍸';
      return '☕';
    }
  };

  // NUOVO: Get user status info
  const getUserStatusInfo = () => {
    if (!user.isLive) return { text: 'Offline', color: '#6B7280' };
    
    const timeDiff = new Date() - new Date(user.lastSeen);
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesAgo < 5) return { text: 'Online ora', color: '#10B981' };
    if (minutesAgo < 15) return { text: `Attivo ${minutesAgo} min fa`, color: '#F59E0B' };
    return { text: 'Offline', color: '#6B7280' };
  };

  // Get star display (solo per caffè)
  const getStarDisplay = (rating) => {
    if (!rating || rating === 0) return { stars: '', color: '#666' };
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '½';
    
    if (rating >= 4.5) return { stars, color: '#FFD700' };
    if (rating >= 4.0) return { stars, color: '#FFA500' };
    if (rating >= 3.5) return { stars, color: '#FF6347' };
    return { stars, color: '#999' };
  };

  if (!shouldRender || (!cafe && !user)) return null;

  const colors = getGradientColors(data);
  const emoji = getEmoji(data);

  return (
    <div 
      className={`marker-hover-tooltip ${isAnimating ? 'visible' : 'hidden'}`}
      style={{
        position: 'fixed',
        left: '50%',
        top: '20px', // Fixed position at top of page
        transform: isAnimating ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(-20px) scale(0.9)',
        zIndex: 10000,
        pointerEvents: 'none',
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        filter: isAnimating ? 'blur(0px)' : 'blur(2px)',
      }}
    >
      {/* Glowing Background with Gradient */}
      <div 
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}25 50%, ${colors.accent}15 100%)`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.primary}40`,
          borderRadius: '16px',
          padding: '12px 16px',
          minWidth: '200px',
          maxWidth: '280px',
          position: 'relative',
          boxShadow: `
            0 8px 32px ${colors.primary}20,
            0 4px 16px ${colors.secondary}15,
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
        }}
      >
        {/* Animated Glow Effect */}
        <div 
          style={{
            position: 'absolute',
            inset: '-2px',
            background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}20, ${colors.accent}30)`,
            borderRadius: '18px',
            zIndex: -1,
            animation: isAnimating ? 'glow-pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {isUserTooltip ? (
            // NUOVO: Contenuto per utenti
            <>
              {/* Header con Avatar e Nome */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px',
                gap: '8px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${colors.primary}`,
                  flexShrink: 0
                }}>
                  {user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.firstName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {user.firstName.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}>
                    {user.firstName} {user.lastName}
                  </h3>
                </div>
              </div>

              {/* Status Display */}
              {(() => {
                const statusInfo = getUserStatusInfo();
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: user.distance ? '6px' : '0'
                  }}>
                    <span style={{ 
                      fontSize: '14px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {emoji}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: statusInfo.color,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {statusInfo.text}
                    </span>
                  </div>
                );
              })()}

              {/* Distance */}
              {user.distance && (
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}>
                  📍 {Math.round(user.distance)}m di distanza
                </div>
              )}
            </>
          ) : (
            // Contenuto esistente per caffè
            <>
              {/* Header with Emoji and Name */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px',
                gap: '8px'
              }}>
                <span style={{ 
                  fontSize: '20px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}>
                  {emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}>
                    {cafe.name}
                  </h3>
                </div>
              </div>

              {/* Rating Display */}
              {cafe.rating && cafe.rating > 0 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '6px'
                }}>
                  {(() => {
                    const starDisplay = getStarDisplay(cafe.rating);
                    return (
                      <>
                        <span style={{ 
                          color: starDisplay.color,
                          fontSize: '14px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          letterSpacing: '1px'
                        }}>
                          {starDisplay.stars}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffffff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>
                          {cafe.rating.toFixed(1)}
                        </span>
                        {cafe.user_ratings_total && (
                          <span style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.7)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            ({cafe.user_ratings_total})
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Type Badge */}
              <div style={{
                display: 'inline-block',
                background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)`,
                border: `1px solid ${colors.primary}60`,
                borderRadius: '8px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: '500',
                color: '#ffffff',
                textTransform: 'capitalize',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
              }}>
                {(() => {
                  const type = (cafe.type || cafe.placeType || 'venue').toLowerCase();
                  return type.includes('restaurant') ? 'Restaurant' : 
                         type.includes('bar') ? 'Bar' : 'Cafe';
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes glow-pulse {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.02);
          }
        }
        
        .marker-hover-tooltip.visible {
          animation: slideInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px) scale(0.9);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
            filter: blur(0px);
          }
        }
      `}</style>
    </div>
  );
};

export default MarkerHoverTooltip;