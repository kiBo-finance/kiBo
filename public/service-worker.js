/**
 * kiBo Service Worker
 * Provides offline support and caching strategies for the PWA
 */

const CACHE_VERSION = 'v3'
const STATIC_CACHE_NAME = `kibo-static-${CACHE_VERSION}`
const API_CACHE_NAME = `kibo-api-${CACHE_VERSION}`
const OFFLINE_DB_NAME = 'kibo-offline'
const OFFLINE_STORE_NAME = 'pendingTransactions'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
]

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/accounts',
  '/api/transactions',
  '/api/cards',
  '/api/currencies',
  '/api/scheduled-transactions',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Skip waiting')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith('kibo-') &&
                cacheName !== STATIC_CACHE_NAME &&
                cacheName !== API_CACHE_NAME
              )
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('[SW] Claiming clients')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests (except for offline transaction handling)
  if (request.method !== 'GET') {
    // Handle offline transaction creation
    if (isTransactionMutation(request)) {
      event.respondWith(handleOfflineMutation(request))
      return
    }
    return
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // API routes - Network First with Cache Fallback
  if (isApiRoute(url.pathname)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE_NAME))
    return
  }

  // Static assets - Cache First with Network Fallback
  event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE_NAME))
})

// Check if URL is an API route
function isApiRoute(pathname) {
  return API_ROUTES.some((route) => pathname.startsWith(route))
}

// Check if request is a transaction mutation
function isTransactionMutation(request) {
  const url = new URL(request.url)
  return (
    url.pathname.startsWith('/api/transactions') &&
    (request.method === 'POST' || request.method === 'PUT')
  )
}

// Cache First strategy with Network Fallback
async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Update cache in background
      fetchAndCache(request, cacheName)
      return cachedResponse
    }

    return await fetchAndCache(request, cacheName)
  } catch (error) {
    console.error('[SW] Cache first failed:', error)
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }
    throw error
  }
}

// Network First strategy with Cache Fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetchAndCache(request, cacheName)
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }

    // Return empty JSON for API requests
    if (isApiRoute(new URL(request.url).pathname)) {
      return new Response(JSON.stringify({ offline: true, data: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    throw error
  }
}

// Fetch and cache response
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request)

  // Only cache successful responses
  if (response.ok) {
    const cache = await caches.open(cacheName)
    // Clone response before caching
    cache.put(request, response.clone())
  }

  return response
}

// Handle offline mutations (save to IndexedDB)
async function handleOfflineMutation(request) {
  try {
    // Try network first
    const response = await fetch(request.clone())
    return response
  } catch (error) {
    // Network failed - save to IndexedDB for later sync
    console.log('[SW] Saving transaction for offline sync')

    try {
      const body = await request.clone().json()
      await saveOfflineTransaction(request, body)

      return new Response(
        JSON.stringify({
          success: true,
          offline: true,
          message: 'Transaction saved for sync when online',
          data: { ...body, _offlineId: Date.now().toString() },
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (saveError) {
      console.error('[SW] Failed to save offline transaction:', saveError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to save transaction offline',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

// Save transaction to IndexedDB
async function saveOfflineTransaction(request, data) {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(OFFLINE_DB_NAME, 1)

    openRequest.onerror = () => reject(openRequest.error)

    openRequest.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        const store = db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    openRequest.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(OFFLINE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(OFFLINE_STORE_NAME)

      const offlineRecord = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'transaction',
        action: request.method === 'POST' ? 'create' : 'update',
        url: request.url,
        method: request.method,
        data: data,
        createdAt: new Date().toISOString(),
        synced: false,
      }

      const addRequest = store.add(offlineRecord)
      addRequest.onsuccess = () => resolve(offlineRecord)
      addRequest.onerror = () => reject(addRequest.error)
    }
  })
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncOfflineTransactions())
  }
})

// Sync offline transactions when back online
async function syncOfflineTransactions() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(OFFLINE_DB_NAME, 1)

    openRequest.onerror = () => reject(openRequest.error)

    openRequest.onsuccess = async (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        resolve()
        return
      }

      const transaction = db.transaction(OFFLINE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(OFFLINE_STORE_NAME)
      const index = store.index('synced')
      const getRequest = index.getAll(false)

      getRequest.onsuccess = async () => {
        const pendingItems = getRequest.result

        for (const item of pendingItems) {
          try {
            const response = await fetch(item.url, {
              method: item.method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data),
            })

            if (response.ok) {
              // Mark as synced
              const updateTx = db.transaction(OFFLINE_STORE_NAME, 'readwrite')
              const updateStore = updateTx.objectStore(OFFLINE_STORE_NAME)
              item.synced = true
              item.syncedAt = new Date().toISOString()
              updateStore.put(item)

              // Notify clients
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({
                    type: 'SYNC_COMPLETE',
                    item: item,
                  })
                })
              })
            }
          } catch (error) {
            console.error('[SW] Failed to sync item:', item.id, error)
          }
        }

        resolve()
      }

      getRequest.onerror = () => reject(getRequest.error)
    }
  })
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data)

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data.type === 'GET_PENDING_COUNT') {
    getPendingCount().then((count) => {
      event.source.postMessage({
        type: 'PENDING_COUNT',
        count: count,
      })
    })
  }

  if (event.data.type === 'SYNC_NOW') {
    syncOfflineTransactions().then(() => {
      event.source.postMessage({ type: 'SYNC_COMPLETE' })
    })
  }
})

// Get count of pending transactions
async function getPendingCount() {
  return new Promise((resolve) => {
    const openRequest = indexedDB.open(OFFLINE_DB_NAME, 1)

    openRequest.onerror = () => resolve(0)

    openRequest.onsuccess = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        resolve(0)
        return
      }

      const transaction = db.transaction(OFFLINE_STORE_NAME, 'readonly')
      const store = transaction.objectStore(OFFLINE_STORE_NAME)
      const index = store.index('synced')
      const countRequest = index.count(false)

      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => resolve(0)
    }
  })
}

console.log('[SW] Service worker loaded')
