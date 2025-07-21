// This works with your existing API calls - no visual changes needed
class MapPerformanceManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimiter = {
      lastRequest: 0,
      minInterval: 100, // 10 requests per second max
      queue: []
    };
  }

  // Wrap your existing API calls with smart throttling
  async throttledApiCall(apiFunction, cacheKey, ttl = 300000) {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log('📦 Using cached data:', cacheKey);
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Rate limit the request
    const promise = this.rateLimitedExecution(async () => {
      try {
        const data = await apiFunction();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        this.pendingRequests.delete(cacheKey);
        return data;
      } catch (error) {
        this.pendingRequests.delete(cacheKey);
        throw error;
      }
    });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  async rateLimitedExecution(apiFunction) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
      const delay = Math.max(0, this.rateLimiter.minInterval - timeSinceLastRequest);

      setTimeout(async () => {
        try {
          this.rateLimiter.lastRequest = Date.now();
          const result = await apiFunction();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  // Smart debouncing for map interactions
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

// Export singleton instance
export const mapPerformance = new MapPerformanceManager();