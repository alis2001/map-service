// backend/services/searchService.js - ADVANCED SEARCH ENGINE
// Location: /backend/services/searchService.js

const fs = require('fs').promises;
const path = require('path');
const { cache } = require('../config/redis');
const googlePlacesService = require('./googlePlacesService');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.citiesData = null;
    this.citiesIndex = new Map(); // Fast lookup index
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔍 Initializing Search Service...');
      
      // Load and index Italian cities
      await this.loadCitiesData();
      await this.buildCitiesIndex();
      
      this.isInitialized = true;
      console.log('✅ Search Service initialized successfully');
      logger.info('Search Service initialized', {
        citiesCount: this.citiesData?.length || 0,
        indexSize: this.citiesIndex.size
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Search Service:', error);
      logger.error('Search Service initialization failed', { error: error.message });
      throw error;
    }
  }

  async loadCitiesData() {
    try {
      const citiesPath = path.join(__dirname, '../cities.json');
      console.log('📂 Loading cities data from:', citiesPath);
      
      const citiesJson = await fs.readFile(citiesPath, 'utf8');
      this.citiesData = JSON.parse(citiesJson);
      
      console.log(`📊 Loaded ${this.citiesData.length} Italian cities`);
      
    } catch (error) {
      console.error('❌ Failed to load cities data:', error);
      throw new Error(`Failed to load cities database: ${error.message}`);
    }
  }

  buildCitiesIndex() {
    console.log('🔨 Building cities search index...');
    
    this.citiesIndex.clear();
    
    this.citiesData.forEach(city => {
      const cityName = city.denominazione_ita.toLowerCase();
      const province = city.sigla_provincia;
      const isCapital = city.flag_capoluogo === 'SI';
      
      // Create searchable variations
      const searchTerms = [
        cityName,
        `${cityName} ${province.toLowerCase()}`,
        city.denominazione_ita_altra?.toLowerCase()
      ].filter(Boolean);
      
      const cityEntry = {
        id: city.codice_istat,
        name: city.denominazione_ita,
        province: province,
        isCapital,
        coordinates: {
          lat: parseFloat(city.lat),
          lng: parseFloat(city.lon)
        },
        searchScore: isCapital ? 100 : 50 // Capitals get higher priority
      };
      
      // Index by all search terms
      searchTerms.forEach(term => {
        if (!this.citiesIndex.has(term)) {
          this.citiesIndex.set(term, []);
        }
        this.citiesIndex.get(term).push(cityEntry);
      });
    });
    
    console.log(`✅ Cities index built with ${this.citiesIndex.size} search terms`);
  }

  // 🔍 CITY AUTOCOMPLETE with smart suggestions
  async searchCities(query, limit = 10) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!query || query.length < 2) {
        return [];
      }
      
      const searchQuery = query.toLowerCase().trim();
      console.log(`🔍 Searching cities for: "${searchQuery}"`);
      
      // Check cache first
      const cacheKey = `city_search:${searchQuery}:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('⚡ City search cache hit');
        return cached;
      }
      
      const results = new Map(); // Use Map to avoid duplicates
      
      // 1. Exact matches (highest priority)
      this.citiesIndex.forEach((cities, term) => {
        if (term.startsWith(searchQuery)) {
          cities.forEach(city => {
            const key = `${city.name}_${city.province}`;
            if (!results.has(key)) {
              results.set(key, { ...city, matchType: 'exact' });
            }
          });
        }
      });
      
      // 2. Partial matches (if we need more results)
      if (results.size < limit) {
        this.citiesIndex.forEach((cities, term) => {
          if (term.includes(searchQuery) && !term.startsWith(searchQuery)) {
            cities.forEach(city => {
              const key = `${city.name}_${city.province}`;
              if (!results.has(key)) {
                results.set(key, { ...city, matchType: 'partial' });
              }
            });
          }
        });
      }
      
      // Sort and limit results
      const sortedResults = Array.from(results.values())
        .sort((a, b) => {
          // Prioritize: exact matches > capitals > alphabetical
          if (a.matchType !== b.matchType) {
            return a.matchType === 'exact' ? -1 : 1;
          }
          if (a.isCapital !== b.isCapital) {
            return a.isCapital ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, limit)
        .map(city => ({
          id: city.id,
          name: city.name,
          province: city.province,
          displayName: `${city.name} (${city.province})`,
          isCapital: city.isCapital,
          coordinates: city.coordinates
        }));
      
      // Cache results for 1 hour
      await cache.set(cacheKey, sortedResults, 3600);
      
      console.log(`✅ Found ${sortedResults.length} cities for "${searchQuery}"`);
      return sortedResults;
      
    } catch (error) {
      console.error('❌ City search error:', error);
      logger.error('City search failed', { query, error: error.message });
      return [];
    }
  }

  // 🏪 PLACE SEARCH within selected city (optimized)
  async searchPlacesInCity(cityCoordinates, query, type = 'all', limit = 20) {
    try {
      console.log(`🏪 Searching for "${query}" in city`, cityCoordinates);
      
      // Cache key includes city coordinates and search params
      const cacheKey = `place_search:${cityCoordinates.lat.toFixed(3)}:${cityCoordinates.lng.toFixed(3)}:${query}:${type}:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('⚡ Place search cache hit');
        return cached;
      }
      
      // Use Google Places Text Search (optimized)
      const searchRadius = 15000; // 15km radius for city search
      
      console.log(`🎯 Advanced search for "${query}" in city`);

      // Multiple search strategies for better results
      const searchStrategies = this.generateSearchStrategies(query, type);
      console.log('🔍 Search strategies:', searchStrategies);

      let allResults = [];
      const seenPlaceIds = new Set();

      // Execute multiple searches and combine results
      for (const searchTerm of searchStrategies.slice(0, 3)) { // Limit to 3 searches
        try {
          const searchQuery = `${searchTerm} near ${cityCoordinates.lat},${cityCoordinates.lng}`;
          
          const results = await googlePlacesService.searchByText(searchQuery, {
            latitude: cityCoordinates.lat,
            longitude: cityCoordinates.lng,
            limit: Math.min(limit * 2, 40), // Search more to filter better
            userLocation: cityCoordinates
          });

          // Add unique results
          results.places.forEach(place => {
            if (!seenPlaceIds.has(place.googlePlaceId)) {
              seenPlaceIds.add(place.googlePlaceId);
              allResults.push({
                ...place,
                searchScore: this.calculateSearchScore(place, query)
              });
            }
          });
        } catch (error) {
          console.log(`⚠️ Search failed for "${searchTerm}":`, error.message);
        }
      }

      console.log(`🔍 Combined results: ${allResults.length} places found`);

      // Use the combined results
      const results = { places: allResults };
      
      // Filter and enhance results
      const enhancedResults = results.places
        .filter(place => {
            // Strict type filtering - only return places that match the selected type
            if (type === 'restaurant') {
                const placeTypes = (place.types || []).join(' ').toLowerCase();
                return placeTypes.includes('restaurant') || 
                    placeTypes.includes('meal_takeaway') ||
                    placeTypes.includes('meal_delivery') ||
                    placeTypes.includes('food') ||
                    placeTypes.includes('pizza') ||
                    place.name.toLowerCase().includes('pizzeria') ||
                    place.name.toLowerCase().includes('ristorante') ||
                    place.name.toLowerCase().includes('trattoria');
            } else if (type === 'cafe') {
                const placeTypes = (place.types || []).join(' ').toLowerCase();
                return placeTypes.includes('cafe') || 
                    placeTypes.includes('bar') ||
                    placeTypes.includes('coffee') ||
                    place.name.toLowerCase().includes('bar') ||
                    place.name.toLowerCase().includes('cafe') ||
                    place.name.toLowerCase().includes('caffè');
            }
            return true;
        })
        .map(place => ({
          id: place.googlePlaceId,
          name: place.name,
          address: place.address,
          coordinates: place.location,
          rating: place.rating,
          priceLevel: place.priceLevel,
          types: place.types,
          distance: place.distance,
          formattedDistance: place.formattedDistance,
          emoji: this.getPlaceEmoji(place.types),
          isOpen: place.openingHours?.openNow,
          searchScore: place.searchScore // Include search score
        }))
        .sort((a, b) => {
          // Sort by search score first, then rating, then distance
          if (a.searchScore !== b.searchScore) {
            return (b.searchScore || 0) - (a.searchScore || 0);
          }
          
          if (a.rating !== b.rating) {
            return (b.rating || 0) - (a.rating || 0);
          }
          
          return (a.distance || 0) - (b.distance || 0);
        })
        .slice(0, limit); // Limit results after sorting
      
      const searchResult = {
        query,
        type,
        city: cityCoordinates,
        results: enhancedResults,
        count: enhancedResults.length,
        timestamp: new Date().toISOString()
      };
      
      // Cache for 2 hours (places change less frequently)
      await cache.set(cacheKey, searchResult, 7200);
      
      console.log(`✅ Found ${enhancedResults.length} places for "${query}"`);
      return searchResult;
      
    } catch (error) {
      console.error('❌ Place search error:', error);
      logger.error('Place search failed', { query, type, error: error.message });
      return { results: [], count: 0, error: error.message };
    }
  }

  // Generate intelligent search strategies
  generateSearchStrategies(query, type) {
    const strategies = [];
    const lowerQuery = query.toLowerCase();
    
    // 1. Original query
    strategies.push(query);
    
    // 2. Query with type
    if (type !== 'all') {
      strategies.push(`${type} ${query}`);
      strategies.push(`${query} ${type}`);
    }
    
    // 3. Smart variations for common Italian terms
    const variations = {
      'nocera': ['nocera cafe', 'cafe nocera', 'bar nocera', 'nocera bar'],
      'centrale': ['bar centrale', 'cafe centrale', 'centrale bar'],
      'sport': ['bar sport', 'cafe sport', 'sport bar'],
      'italia': ['bar italia', 'cafe italia', 'italia bar'],
      'torino': ['cafe torino', 'bar torino', 'torino bar'],
      'pizza': ['pizzeria', 'pizza al taglio', 'pizza da asporto'],
      'gelato': ['gelateria', 'gelato artigianale'],
      'caffe': ['cafe', 'caffè', 'bar caffe'],
      'cafe': ['caffe', 'caffè', 'bar cafe'],
      'bar': ['cafe', 'caffè', 'bar']
    };
    
    // Add variations based on query content
    Object.keys(variations).forEach(key => {
      if (lowerQuery.includes(key)) {
        variations[key].forEach(variation => {
          if (!strategies.includes(variation)) {
            strategies.push(variation);
          }
        });
      }
    });
    
    // 4. Partial match for longer queries
    if (query.length >= 4) {
      strategies.push(query.substring(0, Math.max(3, query.length - 1)));
    }
    
    return strategies;
  }

  // Calculate relevance score for search results
  calculateSearchScore(place, originalQuery) {
    let score = 0;
    const query = originalQuery.toLowerCase();
    const name = place.name.toLowerCase();
    const address = (place.address || '').toLowerCase();

    // Exact name match (highest score)
    if (name === query) score += 100;
    
    // Name starts with query
    if (name.startsWith(query)) score += 80;
    
    // Name contains query as whole word
    const queryWords = query.split(/\s+/);
    const nameWords = name.split(/\s+/);
    
    queryWords.forEach(qWord => {
      nameWords.forEach(nWord => {
        if (nWord === qWord) score += 70; // Exact word match
        if (nWord.startsWith(qWord)) score += 50; // Word starts with query
        if (nWord.includes(qWord)) score += 30; // Word contains query
      });
    });
    
    // Name contains query anywhere
    if (name.includes(query)) score += 40;
    
    // Address contains query
    if (address.includes(query)) score += 20;
    
    // Rating bonus
    if (place.rating >= 4.5) score += 15;
    if (place.rating >= 4.0) score += 10;
    
    // Popular place bonus
    if (place.user_ratings_total > 100) score += 10;
    if (place.user_ratings_total > 50) score += 5;
    
    return score;
  }

  // 🎯 SMART SUGGESTIONS based on popular searches
  async getPopularSearches(cityId, type = 'all', limit = 10) {
    try {
      const cacheKey = `popular_searches:${cityId}:${type}:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
      
      // Popular Italian venue types by city type
      const popularSearches = {
        cafe: [
          'Bar Centrale', 'Caffè Torino', 'Pasticceria', 'Bar Sport',
          'Caffetteria', 'Lavazza', 'Bar Italia', 'Gelateria'
        ],
        restaurant: [
          'Pizzeria', 'Trattoria', 'Ristorante', 'Osteria',
          'Tavola Calda', 'Rosticceria', 'Sushi', 'Pizzeria da Asporto'
        ],
        all: [
          'McDonald\'s', 'Burger King', 'Starbucks', 'KFC',
          'Bar Centrale', 'Pizzeria', 'Ristorante', 'Gelateria'
        ]
      };
      
      const suggestions = popularSearches[type] || popularSearches.all;
      const result = suggestions.slice(0, limit).map((suggestion, index) => ({
        id: `popular_${index}`,
        query: suggestion,
        type: 'popular',
        icon: this.getSearchIcon(suggestion)
      }));
      
      // Cache for 24 hours
      await cache.set(cacheKey, result, 86400);
      return result;
      
    } catch (error) {
      console.error('❌ Popular searches error:', error);
      return [];
    }
  }

  // Helper methods
  getPlaceEmoji(types = []) {
    const typeString = types.join(' ').toLowerCase();
    
    if (typeString.includes('restaurant')) return '🍽️';
    if (typeString.includes('pizza')) return '🍕';
    if (typeString.includes('cafe') || typeString.includes('bar')) return '☕';
    if (typeString.includes('gelato')) return '🍦';
    if (typeString.includes('bakery')) return '🥖';
    if (typeString.includes('fast_food')) return '🍔';
    
    return '📍';
  }

  getSearchIcon(query) {
    const q = query.toLowerCase();
    
    if (q.includes('pizza')) return '🍕';
    if (q.includes('bar') || q.includes('caff')) return '☕';
    if (q.includes('gelat')) return '🍦';
    if (q.includes('mcdonald') || q.includes('burger')) return '🍔';
    if (q.includes('sushi')) return '🍣';
    
    return '🔍';
  }

  // Health check
  async healthCheck() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      citiesLoaded: this.citiesData?.length || 0,
      indexSize: this.citiesIndex.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const searchService = new SearchService();
module.exports = searchService;