// ============================================
// COMPLETE CUSTOM GOOGLE MAPS STYLING SYSTEM
// ============================================

// 1. CREATE MAP STYLES
// Location: frontend/src/components/mapStyles.js

export const customMapStyles = {
  // COFFEE SHOP THEME - Warm, welcoming colors
  coffeeTheme: [
    {
      "featureType": "all",
      "elementType": "all",
      "stylers": [
        { "saturation": -10 },
        { "lightness": 5 }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#89CDF1" },
        { "saturation": -20 }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#F5F3F0" },
        { "lightness": 20 }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#FFFFFF" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [
        { "color": "#E0DDD8" },
        { "weight": 1 }
      ]
    },
    {
      "featureType": "poi.business",
      "elementType": "labels.icon",
      "stylers": [
        { "visibility": "simplified" }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#D4E6B7" }
      ]
    }
  ],

  // ITALIAN ELEGANCE THEME - Sophisticated, matching Italian aesthetics
  italianElegance: [
    {
      "featureType": "all",
      "elementType": "all",
      "stylers": [
        { "saturation": -15 },
        { "lightness": 10 }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#4F7CAC" }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#F7F5F3" }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#E8E2DB" }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#FFFFFF" }
      ]
    },
    {
      "featureType": "road.local",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#FFFFFF" }
      ]
    },
    {
      "featureType": "poi.business",
      "stylers": [
        { "visibility": "on" }
      ]