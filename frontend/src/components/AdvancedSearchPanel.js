import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Coffee, Utensils, Star, Clock, Navigation } from 'lucide-react';

const AdvancedSearchPanel = ({ 
  onPlaceSelect, 
  onCityChange, 
  currentMapCenter,
  currentCafeType = 'cafe',
  onCafeTypeChange,
  className = "" 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState('city'); // 'city' | 'place'
  const [selectedCity, setSelectedCity] = useState(null);
  
  // City search state
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Place search state
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  // Use the app's cafe type instead of local state
  const searchType = currentCafeType === 'restaurant' ? 'restaurant' : 'cafe';
  
  // UI state
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [popularSuggestions, setPopularSuggestions] = useState([]);
  
  const cityInputRef = useRef(null);
  const placeInputRef = useRef(null);
  const debounceRef = useRef(null);

  // 🔍 CITY SEARCH with debounced API calls
  const searchCities = useCallback(async (query) => {
    if (query.length < 2) {
      setCityResults([]);
      return;
    }

    setLoadingCities(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/search/cities?q=${encodeURIComponent(query)}&limit=8`);
      const data = await response.json();
      
      if (data.success) {
        setCityResults(data.data.results);
        console.log(`🏙️ Found ${data.data.results.length} cities for "${query}"`);
      }
    } catch (error) {
      console.error('❌ City search error:', error);
      setCityResults([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // 🏪 PLACE SEARCH with debounced API calls
  const searchPlaces = useCallback(async (query, city, type = 'all') => {
    if (query.length < 2 || !city) {
      setPlaceResults([]);
      return;
    }

    setLoadingPlaces(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/search/places?q=${encodeURIComponent(query)}&lat=${city.coordinates.lat}&lng=${city.coordinates.lng}&type=${type}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setPlaceResults(data.data.results);
        console.log(`🏪 Found ${data.data.results.length} places for "${query}"`);
      }
    } catch (error) {
      console.error('❌ Place search error:', error);
      setPlaceResults([]);
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  // Debounced search handlers
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      if (currentStep === 'city' && cityQuery) {
        searchCities(cityQuery);
      } else if (currentStep === 'place' && placeQuery && selectedCity) {
        searchPlaces(placeQuery, selectedCity, searchType);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityQuery, placeQuery, selectedCity, searchType, currentStep, searchCities, searchPlaces]);

  // Load popular suggestions when city is selected
  useEffect(() => {
    const loadPopularSuggestions = async () => {
      if (selectedCity && currentStep === 'place') {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/v1/search/suggestions?cityId=${selectedCity.id}&type=${searchType}&limit=6`);
          const data = await response.json();
          
          if (data.success) {
            setPopularSuggestions(data.data.suggestions);
          }
        } catch (error) {
          console.error('❌ Popular suggestions error:', error);
        }
      }
    };

    loadPopularSuggestions();
  }, [selectedCity, searchType, currentStep]);

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setCityQuery(city.displayName);
    setShowCitySuggestions(false);
    setCurrentStep('place');
    
    // Focus place input after short delay
    setTimeout(() => {
      placeInputRef.current?.focus();
    }, 200);

    // Update map center
    if (onCityChange) {
      onCityChange(city.coordinates);
    }

    console.log(`🏙️ Selected city: ${city.name} (${city.province})`);
  };

  // Handle place selection
  const handlePlaceSelect = (place) => {
    setPlaceQuery(place.name);
    setShowPlaceSuggestions(false);
    setIsExpanded(false);

    if (onPlaceSelect) {
      onPlaceSelect({
        ...place,
        city: selectedCity
      });
    }

    console.log(`🏪 Selected place: ${place.name}`);
  };

  // Handle popular suggestion click
  const handlePopularSuggestionClick = (suggestion) => {
    setPlaceQuery(suggestion.query);
    placeInputRef.current?.focus();
  };

  // Reset search
  const resetSearch = () => {
    setCurrentStep('city');
    setSelectedCity(null);
    setCityQuery('');
    setPlaceQuery('');
    setCityResults([]);
    setPlaceResults([]);
    setPopularSuggestions([]);
    setShowCitySuggestions(false);
    setShowPlaceSuggestions(false);
  };

  const searchTypes = [
    { value: 'cafe', label: 'Bar/Caffè', icon: Coffee, color: '#F59E0B' },
    { value: 'restaurant', label: 'Ristoranti', icon: Utensils, color: '#E74C3C' }
  ];

  return (
    <div style={{ 
      position: 'fixed', 
      top: '16px', 
      left: '16px', 
      zIndex: 50 
    }}>
      {/* Search Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(16px)',
            color: 'white',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(55, 65, 81, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(31, 41, 55, 0.95)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(17, 24, 39, 0.95)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <Search size={24} style={{ color: '#60A5FA' }} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Cerca locali</span>
        </button>
      )}

      {/* Expanded Search Panel */}
      {isExpanded && (
        <div style={{
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(55, 65, 81, 0.5)',
          padding: '24px',
          width: '384px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              margin: 0
            }}>
              <Search size={20} style={{ color: '#60A5FA' }} />
              Ricerca Avanzata
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                color: '#9CA3AF',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '18px',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              background: currentStep === 'city' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(55, 65, 81, 0.5)',
              color: currentStep === 'city' ? '#93C5FD' : '#9CA3AF',
              transition: 'all 0.3s ease'
            }}>
              <MapPin size={16} />
              1. Città
            </div>
            <div style={{
              width: '32px',
              height: '2px',
              background: selectedCity ? '#3B82F6' : '#4B5563',
              transition: 'background 0.3s ease'
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              background: currentStep === 'place' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(55, 65, 81, 0.5)',
              color: currentStep === 'place' ? '#93C5FD' : '#9CA3AF',
              transition: 'all 0.3s ease'
            }}>
              <Search size={16} />
              2. Locale
            </div>
          </div>

          {/* City Search Step */}
          {currentStep === 'city' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={cityInputRef}
                  type="text"
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  placeholder="Digita il nome della città..."
                  style={{
                    width: '100%',
                    background: 'rgba(31, 41, 55, 0.5)',
                    color: 'white',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    borderRadius: '12px',
                    padding: '12px 40px 12px 16px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <MapPin 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '12px', 
                    color: '#9CA3AF' 
                  }} 
                />
              </div>

              {/* City Results */}
              {showCitySuggestions && (cityResults.length > 0 || loadingCities) && (
                <div style={{
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  maxHeight: '240px',
                  overflowY: 'auto'
                }}>
                  {loadingCities ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #3B82F6',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        margin: '0 auto 8px',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Caricamento città...
                    </div>
                  ) : (
                    cityResults.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px',
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(55, 65, 81, 0.5)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        <MapPin size={16} style={{ color: '#60A5FA' }} />
                        <div>
                          <div style={{ fontWeight: '500' }}>{city.name}</div>
                          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                            {city.province} {city.isCapital && '• Capoluogo'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Place Search Step */}
          {currentStep === 'place' && selectedCity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
              {/* Selected City */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#60A5FA' }} />
                  <span style={{ color: '#93C5FD', fontWeight: '500' }}>{selectedCity.name}</span>
                  <span style={{ color: '#60A5FA', fontSize: '14px' }}>({selectedCity.province})</span>
                </div>
                <button
                  onClick={resetSearch}
                  style={{
                    color: '#60A5FA',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#93C5FD'}
                  onMouseLeave={(e) => e.target.style.color = '#60A5FA'}
                >
                  Cambia
                </button>
              </div>

              {/* Search Type Selector */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {searchTypes.map((type) => {
                  const Icon = type.icon;
                  const isActive = searchType === type.value;
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        console.log('🎨 Search panel type clicked:', type.value);
                        if (onCafeTypeChange) {
                            onCafeTypeChange(type.value);
                        }
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: isActive ? `${type.color}20` : 'rgba(55, 65, 81, 0.5)',
                        color: isActive ? type.color : '#9CA3AF',
                        border: isActive ? `1px solid ${type.color}30` : '1px solid rgba(75, 85, 99, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.target.style.background = 'rgba(75, 85, 99, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.target.style.background = 'rgba(55, 65, 81, 0.5)';
                        }
                      }}
                    >
                      <Icon size={16} />
                      <span style={{ display: window.innerWidth > 640 ? 'inline' : 'none' }}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Place Search Input */}
              <div style={{ position: 'relative' }}>
                <input
                  ref={placeInputRef}
                  type="text"
                  value={placeQuery}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value);
                    setShowPlaceSuggestions(true);
                  }}
                  onFocus={() => setShowPlaceSuggestions(true)}
                  placeholder="Nome del locale (es. Bar Centrale)..."
                  style={{
                    width: '100%',
                    background: 'rgba(31, 41, 55, 0.5)',
                    color: 'white',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    borderRadius: '12px',
                    padding: '12px 40px 12px 16px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <Search 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '12px', 
                    color: '#9CA3AF' 
                  }} 
                />
              </div>

              {/* Popular Suggestions */}
              {!placeQuery && popularSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#D1D5DB', margin: 0 }}>
                    Ricerche popolari:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {popularSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handlePopularSuggestionClick(suggestion)}
                        style={{
                          textAlign: 'left',
                          padding: '8px',
                          background: 'rgba(55, 65, 81, 0.3)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#D1D5DB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          transition: 'background 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(75, 85, 99, 0.5)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(55, 65, 81, 0.3)'}
                      >
                        <span style={{ fontSize: '18px' }}>{suggestion.icon}</span>
                        <span>{suggestion.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Place Results */}
              {showPlaceSuggestions && (placeResults.length > 0 || loadingPlaces) && (
                <div style={{
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {loadingPlaces ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #3B82F6',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        margin: '0 auto 8px',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Ricerca locali...
                    </div>
                  ) : (
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {placeResults.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => handlePlaceSelect(place)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'background 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(55, 65, 81, 0.5)'}
                          onMouseLeave={(e) => e.target.style.background = 'none'}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span style={{ fontSize: '20px', marginTop: '2px' }}>
                              {place.emoji}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontWeight: '500', 
                                marginBottom: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {place.name}
                              </div>
                              <div style={{ 
                                fontSize: '14px', 
                                color: '#9CA3AF', 
                                marginBottom: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {place.address}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                {place.rating && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24', fontSize: '14px' }}>
                                    <Star size={12} style={{ fill: 'currentColor' }} />
                                    <span>{place.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {place.formattedDistance && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60A5FA', fontSize: '14px' }}>
                                    <Navigation size={12} />
                                    <span>{place.formattedDistance}</span>
                                  </div>
                                )}
                                {place.isOpen !== undefined && (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    fontSize: '14px',
                                    color: place.isOpen ? '#10B981' : '#EF4444'
                                  }}>
                                    <Clock size={12} />
                                    <span>{place.isOpen ? 'Aperto' : 'Chiuso'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdvancedSearchPanel;