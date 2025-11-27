// ClassFlow AI Service Worker
// Provides offline capability and performance optimization

const CACHE_NAME = 'classflow-v5'
const API_CACHE_NAME = 'classflow-api-v5'

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets')
        // Don't fail if some assets aren't available yet
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => {
              console.log('🗑️ Service Worker: Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    // Special handling for API requests
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstStrategy(request))
    }
    return
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request))
})

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('💾 Service Worker: Serving from cache:', request.url)
      return cachedResponse
    }

    console.log('🌐 Service Worker: Fetching from network:', request.url)
    const networkResponse = await fetch(request)

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('❌ Service Worker: Fetch failed:', error)

    // Return offline page or fallback
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Network-first strategy (for API requests)
async function networkFirstStrategy(request) {
  try {
    console.log('🌐 Service Worker: API request (network-first):', request.url)
    const networkResponse = await fetch(request)

    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.warn('⚠️ Service Worker: Network failed, trying cache:', error)

    // Try to serve from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('💾 Service Worker: Serving API response from cache')
      return cachedResponse
    }

    // No cache available
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Unable to connect to the server. Please check your internet connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})

console.log('✅ Service Worker: Loaded successfully')
