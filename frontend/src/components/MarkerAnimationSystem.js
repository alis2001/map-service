// components/MarkerAnimationSystem.js - ADVANCED CINEMATIC MARKER CONTROLLER
// Location: /frontend/src/components/MarkerAnimationSystem.js

import { useCallback, useRef, useEffect } from 'react';

/**
 * 🎬 ADVANCED MARKER ANIMATION SYSTEM
 * 
 * This system provides sophisticated animation controls for map markers including:
 * - Staggered appearance/disappearance animations
 * - Zoom-based visibility transitions
 * - Quality-based animation priorities
 * - Performance-optimized animation queuing
 * - Cinematic effect coordination
 */

export const useMarkerAnimationSystem = () => {
  // Animation state management
  const animationQueueRef = useRef([]);
  const activeAnimationsRef = useRef(new Map());
  const animationTimersRef = useRef(new Map());
  const performanceMetricsRef = useRef({
    framerate: 60,
    animationLoad: 0,
    lastUpdate: Date.now()
  });

  // 🎯 PERFORMANCE MONITORING
  const updatePerformanceMetrics = useCallback(() => {
    const now = Date.now();
    const deltaTime = now - performanceMetricsRef.current.lastUpdate;
    const expectedFrameTime = 1000 / 60; // 60fps
    
    performanceMetricsRef.current.framerate = Math.min(60, 1000 / deltaTime);
    performanceMetricsRef.current.animationLoad = activeAnimationsRef.current.size;
    performanceMetricsRef.current.lastUpdate = now;
    
    // Adaptive quality adjustment
    if (performanceMetricsRef.current.framerate < 30) {
      console.log('🎬 Performance optimization: Reducing animation complexity');
      return 'reduced';
    } else if (performanceMetricsRef.current.framerate < 45) {
      return 'medium';
    }
    return 'high';
  }, []);

  // 🎭 ANIMATION QUEUE SYSTEM
  const queueAnimation = useCallback((animationConfig) => {
    const {
      markerId,
      type, // 'appear', 'disappear', 'hover', 'click'
      priority = 1, // 1-5, higher = more important
      delay = 0,
      duration = 300,
      easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      onComplete = null
    } = animationConfig;

    const animation = {
      id: `${markerId}_${type}_${Date.now()}`,
      markerId,
      type,
      priority,
      delay,
      duration,
      easing,
      onComplete,
      startTime: null,
      status: 'queued' // queued, running, completed, cancelled
    };

    // Insert animation in priority order
    const insertIndex = animationQueueRef.current.findIndex(
      anim => anim.priority < animation.priority
    );
    
    if (insertIndex === -1) {
      animationQueueRef.current.push(animation);
    } else {
      animationQueueRef.current.splice(insertIndex, 0, animation);
    }

    return animation.id;
  }, []);

  // 🎬 STAGGERED MARKER APPEARANCE
  const animateMarkersAppearing = useCallback((markerIds, options = {}) => {
    const {
      staggerDelay = 80,
      maxStagger = 1000,
      animationType = 'bounce',
      qualityBased = true
    } = options;

    console.log(`🎬 Animating ${markerIds.length} markers appearing with stagger`);

    markerIds.forEach((markerId, index) => {
      const baseDelay = Math.min(index * staggerDelay, maxStagger);
      
      // Quality-based delay adjustment
      let priorityMultiplier = 1;
      if (qualityBased) {
        // Assume higher quality markers (first in array) appear faster
        priorityMultiplier = index < 5 ? 0.7 : index < 10 ? 0.85 : 1;
      }
      
      const finalDelay = baseDelay * priorityMultiplier;
      
      queueAnimation({
        markerId,
        type: 'appear',
        priority: qualityBased ? (5 - Math.min(index, 4)) : 3,
        delay: finalDelay,
        duration: animationType === 'bounce' ? 400 : 300,
        easing: animationType === 'bounce' 
          ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
    });

    return processAnimationQueue();
  }, [queueAnimation]);

  // 🌊 SMOOTH MARKER DISAPPEARANCE
  const animateMarkersDisappearing = useCallback((markerIds, options = {}) => {
    const {
      staggerDelay = 40,
      animationType = 'fade',
      direction = 'random' // 'random', 'center-out', 'edge-in'
    } = options;

    console.log(`🎬 Animating ${markerIds.length} markers disappearing`);

    let orderedIds = [...markerIds];
    
    // Apply different ordering based on direction
    if (direction === 'random') {
      orderedIds = orderedIds.sort(() => Math.random() - 0.5);
    }
    
    orderedIds.forEach((markerId, index) => {
      queueAnimation({
        markerId,
        type: 'disappear',
        priority: 4, // High priority for removal
        delay: index * staggerDelay,
        duration: animationType === 'fade' ? 250 : 300,
        easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)'
      });
    });

    return processAnimationQueue();
  }, [queueAnimation]);

  // 🎯 ZOOM-BASED VISIBILITY TRANSITIONS
  const animateZoomTransition = useCallback((visibleMarkers, hiddenMarkers, zoomLevel) => {
    const performanceLevel = updatePerformanceMetrics();
    
    console.log(`🔍 Zoom transition at level ${zoomLevel}, performance: ${performanceLevel}`);
    
    // Adjust animation complexity based on performance
    const staggerDelay = performanceLevel === 'high' ? 60 : performanceLevel === 'medium' ? 100 : 150;
    const animationDuration = performanceLevel === 'high' ? 350 : 250;
    
    // Hide markers that are no longer visible
    if (hiddenMarkers.length > 0) {
      animateMarkersDisappearing(hiddenMarkers, {
        staggerDelay: staggerDelay * 0.7,
        animationType: 'fade'
      });
    }
    
    // Show new markers with delay to avoid overlap
    if (visibleMarkers.length > 0) {
      setTimeout(() => {
        animateMarkersAppearing(visibleMarkers, {
          staggerDelay,
          animationType: zoomLevel >= 16 ? 'bounce' : 'slide',
          qualityBased: true
        });
      }, hiddenMarkers.length * staggerDelay * 0.7 + 200);
    }
  }, [animateMarkersAppearing, animateMarkersDisappearing, updatePerformanceMetrics]);

  // 🎨 MARKER HOVER ANIMATION
  const animateMarkerHover = useCallback((markerId, isEntering) => {
    // Cancel any existing hover animations for this marker
    const existingAnimationId = activeAnimationsRef.current.get(`${markerId}_hover`);
    if (existingAnimationId) {
      cancelAnimation(existingAnimationId);
    }

    const animationId = queueAnimation({
      markerId,
      type: isEntering ? 'hover_enter' : 'hover_exit',
      priority: 5, // Highest priority for immediate feedback
      delay: 0,
      duration: isEntering ? 200 : 150,
      easing: isEntering 
        ? 'cubic-bezier(0.4, 0, 0.2, 1)' 
        : 'cubic-bezier(0.55, 0.085, 0.68, 0.53)'
    });

    activeAnimationsRef.current.set(`${markerId}_hover`, animationId);
    return animationId;
  }, [queueAnimation]);

  // 🎬 MARKER CLICK ANIMATION
  const animateMarkerClick = useCallback((markerId) => {
    console.log(`🎯 Animating marker click: ${markerId}`);
    
    return queueAnimation({
      markerId,
      type: 'click',
      priority: 5,
      delay: 0,
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      onComplete: () => {
        console.log(`✅ Marker click animation completed: ${markerId}`);
      }
    });
  }, [queueAnimation]);

  // ⚡ ANIMATION QUEUE PROCESSOR
  const processAnimationQueue = useCallback(() => {
    const performanceLevel = updatePerformanceMetrics();
    const maxConcurrentAnimations = performanceLevel === 'high' ? 8 : performanceLevel === 'medium' ? 5 : 3;
    
    const now = Date.now();
    const runningAnimations = Array.from(activeAnimationsRef.current.values())
      .filter(anim => anim.status === 'running').length;
    
    if (runningAnimations >= maxConcurrentAnimations) {
      // Schedule next check
      setTimeout(processAnimationQueue, 50);
      return;
    }
    
    // Find next animation to start
    const nextAnimation = animationQueueRef.current.find(anim => 
      anim.status === 'queued' && 
      (!anim.startTime || now >= anim.startTime + anim.delay)
    );
    
    if (nextAnimation) {
      startAnimation(nextAnimation);
      setTimeout(processAnimationQueue, 16); // ~60fps check
    } else if (animationQueueRef.current.length > 0) {
      // Check again in a bit
      setTimeout(processAnimationQueue, 50);
    }
  }, [updatePerformanceMetrics]);

  // 🚀 START INDIVIDUAL ANIMATION
  const startAnimation = useCallback((animation) => {
    animation.status = 'running';
    animation.startTime = Date.now();
    
    console.log(`🎬 Starting animation: ${animation.id} (${animation.type})`);
    
    // Create CSS animation or direct DOM manipulation
    const element = document.querySelector(`[data-marker-id="${animation.markerId}"]`);
    if (!element) {
      console.warn(`⚠️ Marker element not found: ${animation.markerId}`);
      completeAnimation(animation);
      return;
    }
    
    // Apply animation based on type
    switch (animation.type) {
      case 'appear':
        element.style.animation = `markerAppear ${animation.duration}ms ${animation.easing} forwards`;
        element.style.opacity = '0';
        element.style.transform = 'scale(0.3)';
        break;
        
      case 'disappear':
        element.style.animation = `markerDisappear ${animation.duration}ms ${animation.easing} forwards`;
        break;
        
      case 'hover_enter':
        element.style.animation = `markerHover ${animation.duration}ms ${animation.easing} forwards`;
        element.style.filter = 'brightness(1.2) saturate(1.3)';
        break;
        
      case 'hover_exit':
        element.style.animation = '';
        element.style.filter = '';
        element.style.transform = '';
        completeAnimation(animation);
        return;
        
      case 'click':
        element.style.animation = `markerPulse ${animation.duration}ms ${animation.easing} forwards`;
        break;
        
      default:
        console.warn(`⚠️ Unknown animation type: ${animation.type}`);
        completeAnimation(animation);
        return;
    }
    
    // Set completion timer
    const timerId = setTimeout(() => {
      completeAnimation(animation);
    }, animation.duration + 50); // Small buffer
    
    animationTimersRef.current.set(animation.id, timerId);
    activeAnimationsRef.current.set(animation.id, animation);
    
  }, []);

  // ✅ COMPLETE ANIMATION
  const completeAnimation = useCallback((animation) => {
    animation.status = 'completed';
    
    // Clear timer
    const timerId = animationTimersRef.current.get(animation.id);
    if (timerId) {
      clearTimeout(timerId);
      animationTimersRef.current.delete(animation.id);
    }
    
    // Remove from active animations
    activeAnimationsRef.current.delete(animation.id);
    
    // Remove from queue
    const queueIndex = animationQueueRef.current.findIndex(anim => anim.id === animation.id);
    if (queueIndex !== -1) {
      animationQueueRef.current.splice(queueIndex, 1);
    }
    
    // Call completion callback
    if (animation.onComplete) {
      try {
        animation.onComplete(animation);
      } catch (error) {
        console.error('Animation completion callback error:', error);
      }
    }
    
    console.log(`✅ Animation completed: ${animation.id}`);
    
    // Continue processing queue
    processAnimationQueue();
  }, [processAnimationQueue]);

  // ❌ CANCEL ANIMATION
  const cancelAnimation = useCallback((animationId) => {
    const animation = activeAnimationsRef.current.get(animationId);
    if (animation) {
      animation.status = 'cancelled';
      
      const timerId = animationTimersRef.current.get(animationId);
      if (timerId) {
        clearTimeout(timerId);
        animationTimersRef.current.delete(animationId);
      }
      
      activeAnimationsRef.current.delete(animationId);
      
      // Remove from queue
      const queueIndex = animationQueueRef.current.findIndex(anim => anim.id === animationId);
      if (queueIndex !== -1) {
        animationQueueRef.current.splice(queueIndex, 1);
      }
      
      console.log(`❌ Animation cancelled: ${animationId}`);
    }
  }, []);

  // 🧹 CLEANUP ALL ANIMATIONS
  const clearAllAnimations = useCallback(() => {
    console.log('🧹 Clearing all marker animations');
    
    // Clear all timers
    animationTimersRef.current.forEach(timerId => clearTimeout(timerId));
    animationTimersRef.current.clear();
    
    // Clear all active animations
    activeAnimationsRef.current.clear();
    
    // Clear queue
    animationQueueRef.current = [];
    
    // Reset all marker elements
    document.querySelectorAll('[data-marker-id]').forEach(element => {
      element.style.animation = '';
      element.style.transform = '';
      element.style.filter = '';
      element.style.opacity = '';
    });
  }, []);

  // 📊 GET ANIMATION STATUS
  const getAnimationStatus = useCallback(() => {
    return {
      queueLength: animationQueueRef.current.length,
      activeAnimations: activeAnimationsRef.current.size,
      performance: performanceMetricsRef.current,
      upcomingAnimations: animationQueueRef.current
        .filter(anim => anim.status === 'queued')
        .slice(0, 5)
        .map(anim => ({
          id: anim.id,
          type: anim.type,
          priority: anim.priority,
          delay: anim.delay
        }))
    };
  }, []);

  // 🎬 CINEMATIC MODE TOGGLE
  const setCinematicMode = useCallback((enabled) => {
    if (enabled) {
      console.log('🎬 Enabling cinematic mode');
      document.documentElement.style.setProperty('--animation-speed', '1.2');
      document.documentElement.style.setProperty('--animation-quality', 'high');
    } else {
      console.log('🎬 Disabling cinematic mode');
      document.documentElement.style.setProperty('--animation-speed', '1');
      document.documentElement.style.setProperty('--animation-quality', 'medium');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllAnimations();
    };
  }, [clearAllAnimations]);

  return {
    // Main animation functions
    animateMarkersAppearing,
    animateMarkersDisappearing,
    animateZoomTransition,
    animateMarkerHover,
    animateMarkerClick,
    
    // Queue management
    queueAnimation,
    cancelAnimation,
    clearAllAnimations,
    
    // Status and control
    getAnimationStatus,
    setCinematicMode,
    
    // Performance monitoring
    updatePerformanceMetrics
  };
};

// 🎯 HELPER FUNCTIONS

/**
 * Calculate optimal stagger delay based on marker count and performance
 */
export const calculateOptimalStagger = (markerCount, performanceLevel = 'high') => {
  const baseDelays = {
    high: { min: 50, max: 80, cap: 800 },
    medium: { min: 80, max: 120, cap: 1000 },
    reduced: { min: 120, max: 200, cap: 1200 }
  };
  
  const config = baseDelays[performanceLevel] || baseDelays.medium;
  
  if (markerCount <= 5) return config.min;
  if (markerCount <= 15) return config.min + (markerCount - 5) * 5;
  if (markerCount <= 30) return config.max;
  
  // For large counts, use adaptive timing
  return Math.min(config.max + (markerCount - 30) * 2, config.cap / markerCount);
};

/**
 * Get animation configuration based on marker quality
 */
export const getQualityBasedAnimation = (popularityScore, markerType = 'cafe') => {
  const quality = popularityScore >= 0.8 ? 'premium' : 
                 popularityScore >= 0.6 ? 'high' : 
                 popularityScore >= 0.4 ? 'medium' : 'basic';
  
  const configs = {
    premium: {
      duration: 500,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      effects: ['bounce', 'glow', 'sparkle'],
      priority: 5
    },
    high: {
      duration: 400,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      effects: ['bounce', 'glow'],
      priority: 4
    },
    medium: {
      duration: 350,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      effects: ['slide'],
      priority: 3
    },
    basic: {
      duration: 300,
      easing: 'ease-out',
      effects: ['fade'],
      priority: 2
    }
  };
  
  return configs[quality];
};

export default useMarkerAnimationSystem;