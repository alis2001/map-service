// public/sw.js - FIXED Service Worker for Map Service
// Location: /frontend/public/sw.js

const CACHE_NAME = 'map-service-v1';

// Only cache essential static assets that actually exist
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opened cache');
        // Try to cache each URL individually to avoid failures
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Service Worker installation failed:', err);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );
});

// FIXED: Improved fetch handler with better error handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external URLs (different origin)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip API calls - let them go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip health checks - always go to network
  if (url.pathname === '/health') {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          console.log('📦 Cache hit for:', request.url);
          return cachedResponse;
        }
        
        // Fetch from network with timeout and error handling
        console.log('🌐 Fetching from network:', request.url);
        
        return fetch(request)
          .then((networkResponse) => {
            // Check if response is valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone response for caching
            const responseToCache = networkResponse.clone();
            
            // Cache successful responses
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache).catch(err => {
                  console.warn('Failed to cache response:', err);
                });
              });
            
            return networkResponse;
          })
          .catch((fetchError) => {
            console.warn('🚫 Network fetch failed for:', request.url, fetchError);
            
            // For navigation requests, return the cached index.html
            if (request.mode === 'navigate') {
              return caches.match('/').then(cachedIndex => {
                if (cachedIndex) {
                  console.log('📦 Returning cached index for navigation');
                  return cachedIndex;
                }
                // Return a basic offline page if nothing cached
                return new Response(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>CoffeeFinder - Offline</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #6F4E37 0%, #DEB887 100%);
                        color: white;
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                      }
                      .offline-container {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                      }
                      h1 { margin-bottom: 20px; }
                      button { 
                        background: #fff; 
                        color: #6F4E37; 
                        border: none; 
                        padding: 12px 24px; 
                        border-radius: 8px; 
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="offline-container">
                      <h1>☕ CoffeeFinder</h1>
                      <h2>You're offline</h2>
                      <p>Please check your internet connection and try again.</p>
                      <button onclick="window.location.reload()">🔄 Retry</button>
                    </div>
                  </body>
                  </html>
                `, {
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            
            // For other requests, just fail
            throw fetchError;
          });
      })
      .catch((error) => {
        console.error('🚨 Cache match failed:', error);
        // Try to fetch from network as fallback
        return fetch(request).catch(() => {
          // Return a generic error response
          return new Response('Service temporarily unavailable', {
            status: 503,
            statusText: 'Service Worker Error'
          });
        });
      })
  );
});

// Handle background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    // Could implement offline data sync here
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: 'New cafes discovered near you!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'cafe-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Cafes'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CoffeeFinder Map', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📬 Notification clicked');
  
  event.notification.close();
  
  // Open the app
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// Handle service worker errors
self.addEventListener('error', (event) => {
  console.error('🚨 Service Worker error:', event.error);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Service Worker unhandled rejection:', event.reason);
  event.preventDefault(); // Prevent the default browser behavior
});