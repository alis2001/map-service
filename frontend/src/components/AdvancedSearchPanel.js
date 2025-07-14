import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Coffee, Utensils, Star, Clock, Navigation } from 'lucide-react';

const AdvancedSearchPanel = ({ 
  onPlaceSelect, 
  onCityChange, 
  currentMapCenter,
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
  const [searchType, setSearchType] = useState('all');
  
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
      const response = await fetch(`/api/v1/search/cities?q=${encodeURIComponent(query)}&limit=8`);
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
      const response = await fetch(
        `/api/v1/search/places?q=${encodeURIComponent(query)}&lat=${city.coordinates.lat}&lng=${city.coordinates.lng}&type=${type}&limit=10`
      );
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
          const response = await fetch(`/api/v1/search/suggestions?cityId=${selectedCity.id}&type=${searchType}&limit=6`);
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
    { value: 'all', label: 'Tutto', icon: Search, color: 'blue' },
    { value: 'cafe', label: 'Bar/Caffè', icon: Coffee, color: 'amber' },
    { value: 'restaurant', label: 'Ristoranti', icon: Utensils, color: 'green' }
  ];

  return (
    <div className={`fixed top-4 left-4 z-50 ${className}`}>
      {/* Search Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-gray-700/50 hover:bg-gray-800/95 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-sm font-medium">Cerca locali</span>
          </div>
        </button>
      )}

      {/* Expanded Search Panel */}
      {isExpanded && (
        <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-6 w-96 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Ricerca Avanzata
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              currentStep === 'city' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700/50 text-gray-400'
            }`}>
              <MapPin className="w-4 h-4" />
              1. Città
            </div>
            <div className={`w-8 h-0.5 ${selectedCity ? 'bg-blue-500' : 'bg-gray-600'} transition-colors`} />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              currentStep === 'place' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700/50 text-gray-400'
            }`}>
              <Search className="w-4 h-4" />
              2. Locale
            </div>
          </div>

          {/* City Search Step */}
          {currentStep === 'city' && (
            <div className="space-y-4">
              <div className="relative">
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
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <MapPin className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>

              {/* City Results */}
              {showCitySuggestions && (cityResults.length > 0 || loadingCities) && (
                <div className="bg-gray-800/50 rounded-xl border border-gray-600/50 max-h-60 overflow-y-auto">
                  {loadingCities ? (
                    <div className="p-4 text-center text-gray-400">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                      Caricamento città...
                    </div>
                  ) : (
                    cityResults.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className="w-full text-left p-3 hover:bg-gray-700/50 transition-colors flex items-center gap-3 group"
                      >
                        <MapPin className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                        <div>
                          <div className="text-white font-medium">{city.name}</div>
                          <div className="text-gray-400 text-sm">{city.province} {city.isCapital && '• Capoluogo'}</div>
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
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Selected City */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-medium">{selectedCity.name}</span>
                  <span className="text-blue-400 text-sm">({selectedCity.province})</span>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Cambia
                </button>
              </div>

              {/* Search Type Selector */}
              <div className="flex gap-2">
                {searchTypes.map((type) => {
                  const Icon = type.icon;
                  const isActive = searchType === type.value;
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSearchType(type.value)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive 
                          ? `bg-${type.color}-500/20 text-${type.color}-300 border border-${type.color}-500/30` 
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Place Search Input */}
              <div className="relative">
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
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>

              {/* Popular Suggestions */}
              {!placeQuery && popularSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Ricerche popolari:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {popularSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handlePopularSuggestionClick(suggestion)}
                        className="text-left p-2 bg-gray-700/30 hover:bg-gray-600/50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <span className="text-lg">{suggestion.icon}</span>
                        <span className="text-gray-300">{suggestion.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Place Results */}
              {showPlaceSuggestions && (placeResults.length > 0 || loadingPlaces) && (
                <div className="bg-gray-800/50 rounded-xl border border-gray-600/50 flex-1 overflow-hidden flex flex-col">
                  {loadingPlaces ? (
                    <div className="p-4 text-center text-gray-400">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                      Ricerca locali...
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1">
                      {placeResults.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => handlePlaceSelect(place)}
                          className="w-full text-left p-3 hover:bg-gray-700/50 transition-colors border-b border-gray-600/30 last:border-b-0 group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{place.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium group-hover:text-blue-300 transition-colors truncate">
                                {place.name}
                              </div>
                              <div className="text-gray-400 text-sm truncate">{place.address}</div>
                              <div className="flex items-center gap-3 mt-1">
                                {place.rating && (
                                  <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{place.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {place.formattedDistance && (
                                  <div className="flex items-center gap-1 text-blue-400 text-sm">
                                    <Navigation className="w-3 h-3" />
                                    <span>{place.formattedDistance}</span>
                                  </div>
                                )}
                                {place.isOpen !== undefined && (
                                  <div className={`flex items-center gap-1 text-sm ${
                                    place.isOpen ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    <Clock className="w-3 h-3" />
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
    </div>
  );
};

export default AdvancedSearchPanel;