/**
 * Offline Store - IndexedDB wrapper for offline data management
 * Handles offline transaction storage and retrieval
 */

const DB_NAME = 'kibo-offline'
const DB_VERSION = 1

// Store names
export const STORES = {
  PENDING_TRANSACTIONS: 'pendingTransactions',
  CACHED_DATA: 'cachedData',
} as const

// Transaction types
export type OfflineActionType = 'create' | 'update' | 'delete'
export type OfflineEntityType = 'transaction' | 'account' | 'card'

export interface OfflineTransaction {
  id: string
  type: OfflineEntityType
  action: OfflineActionType
  url: string
  method: string
  data: Record<string, unknown>
  createdAt: string
  synced: boolean
  syncedAt?: string
  error?: string
}

export interface CachedData {
  key: string
  data: unknown
  cachedAt: string
  expiresAt?: string
}

// Get database connection
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`))
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create pending transactions store
      if (!db.objectStoreNames.contains(STORES.PENDING_TRANSACTIONS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_TRANSACTIONS, {
          keyPath: 'id',
        })
        pendingStore.createIndex('synced', 'synced', { unique: false })
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false })
        pendingStore.createIndex('type', 'type', { unique: false })
      }

      // Create cached data store
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_DATA, {
          keyPath: 'key',
        })
        cacheStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

/**
 * Save a transaction for offline sync
 */
export async function saveOfflineTransaction(
  entityType: OfflineEntityType,
  action: OfflineActionType,
  url: string,
  method: string,
  data: Record<string, unknown>
): Promise<OfflineTransaction> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)

    const record: OfflineTransaction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: entityType,
      action,
      url,
      method,
      data,
      createdAt: new Date().toISOString(),
      synced: false,
    }

    const request = store.add(record)

    request.onsuccess = () => {
      db.close()
      resolve(record)
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to save offline transaction: ${request.error?.message}`))
    }
  })
}

/**
 * Get all pending (unsynced) transactions
 */
export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readonly')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const request = store.getAll()

    request.onsuccess = () => {
      db.close()
      // Filter for unsynced transactions
      const pending = (request.result as OfflineTransaction[]).filter((t) => !t.synced)
      resolve(pending)
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to get pending transactions: ${request.error?.message}`))
    }
  })
}

/**
 * Get count of pending transactions
 */
export async function getPendingCount(): Promise<number> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readonly')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const request = store.getAll()

    request.onsuccess = () => {
      db.close()
      // Count unsynced transactions
      const count = (request.result as OfflineTransaction[]).filter((t) => !t.synced).length
      resolve(count)
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to get pending count: ${request.error?.message}`))
    }
  })
}

/**
 * Mark a transaction as synced
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const record = getRequest.result
      if (record) {
        record.synced = true
        record.syncedAt = new Date().toISOString()
        const putRequest = store.put(record)

        putRequest.onsuccess = () => {
          db.close()
          resolve()
        }

        putRequest.onerror = () => {
          db.close()
          reject(new Error(`Failed to mark as synced: ${putRequest.error?.message}`))
        }
      } else {
        db.close()
        resolve()
      }
    }

    getRequest.onerror = () => {
      db.close()
      reject(new Error(`Failed to get transaction: ${getRequest.error?.message}`))
    }
  })
}

/**
 * Mark a transaction as failed with error
 */
export async function markAsFailed(id: string, error: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const record = getRequest.result
      if (record) {
        record.error = error
        const putRequest = store.put(record)

        putRequest.onsuccess = () => {
          db.close()
          resolve()
        }

        putRequest.onerror = () => {
          db.close()
          reject(new Error(`Failed to mark as failed: ${putRequest.error?.message}`))
        }
      } else {
        db.close()
        resolve()
      }
    }

    getRequest.onerror = () => {
      db.close()
      reject(new Error(`Failed to get transaction: ${getRequest.error?.message}`))
    }
  })
}

/**
 * Delete a synced transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const request = store.delete(id)

    request.onsuccess = () => {
      db.close()
      resolve()
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to delete transaction: ${request.error?.message}`))
    }
  })
}

/**
 * Clear all synced transactions
 */
export async function clearSyncedTransactions(): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_TRANSACTIONS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_TRANSACTIONS)
    const request = store.openCursor()

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        const record = cursor.value as OfflineTransaction
        if (record.synced) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        db.close()
        resolve()
      }
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to clear synced transactions: ${request.error?.message}`))
    }
  })
}

/**
 * Cache data for offline access
 */
export async function cacheData(key: string, data: unknown, ttlMs?: number): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite')
    const store = transaction.objectStore(STORES.CACHED_DATA)

    const record: CachedData = {
      key,
      data,
      cachedAt: new Date().toISOString(),
      expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : undefined,
    }

    const request = store.put(record)

    request.onsuccess = () => {
      db.close()
      resolve()
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to cache data: ${request.error?.message}`))
    }
  })
}

/**
 * Get cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readonly')
    const store = transaction.objectStore(STORES.CACHED_DATA)
    const request = store.get(key)

    request.onsuccess = () => {
      db.close()
      const record = request.result as CachedData | undefined

      if (!record) {
        resolve(null)
        return
      }

      // Check expiration
      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        // Data expired, delete it
        deleteCachedData(key).catch(console.error)
        resolve(null)
        return
      }

      resolve(record.data as T)
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to get cached data: ${request.error?.message}`))
    }
  })
}

/**
 * Delete cached data
 */
export async function deleteCachedData(key: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite')
    const store = transaction.objectStore(STORES.CACHED_DATA)
    const request = store.delete(key)

    request.onsuccess = () => {
      db.close()
      resolve()
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to delete cached data: ${request.error?.message}`))
    }
  })
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite')
    const store = transaction.objectStore(STORES.CACHED_DATA)
    const request = store.clear()

    request.onsuccess = () => {
      db.close()
      resolve()
    }

    request.onerror = () => {
      db.close()
      reject(new Error(`Failed to clear cache: ${request.error?.message}`))
    }
  })
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
