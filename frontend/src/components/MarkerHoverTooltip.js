// components/MarkerHoverTooltip.js - Beautiful Animated Hover Tooltip
// Location: /frontend/src/components/MarkerHoverTooltip.js

import React, { useEffect, useState } from 'react';

const MarkerHoverTooltip = ({ 
  cafe, 
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

  // Get color gradient based on cafe type and rating
  const getGradientColors = (cafe) => {
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
  };

  // Get appropriate emoji based on type
  const getEmoji = (cafe) => {
    const type = (cafe.type || cafe.placeType || '').toLowerCase();
    if (type.includes('restaurant') || type.includes('ristorante')) return '🍽️';
    if (type.includes('pizzeria')) return '🍕';
    if (type.includes('bar') && !type.includes('restaurant')) return '🍸';
    return '☕';
  };

  // Get star display
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

  if (!shouldRender || !cafe) return null;

  const colors = getGradientColors(cafe);
  const emoji = getEmoji(cafe);
  const starDisplay = getStarDisplay(cafe.rating);
  const type = (cafe.type || cafe.placeType || 'venue').toLowerCase();

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
            {type.includes('restaurant') ? 'Restaurant' : 
             type.includes('bar') ? 'Bar' : 'Cafe'}
          </div>

          {/* Remove distance display */}
        </div>

        {/* Tooltip Arrow - Remove since it's at top of page */}
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