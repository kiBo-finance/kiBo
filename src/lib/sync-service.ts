/**
 * Sync Service - Handles synchronization of offline data with the server
 */

import {
  getPendingTransactions,
  markAsSynced,
  markAsFailed,
  clearSyncedTransactions,
  type OfflineTransaction,
} from './offline-store'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface SyncResult {
  status: SyncStatus
  synced: number
  failed: number
  total: number
  errors: Array<{ id: string; error: string }>
}

export type SyncEventHandler = (result: SyncResult) => void

// Event listeners
const syncListeners = new Set<SyncEventHandler>()

// Current sync status
let currentSyncStatus: SyncStatus = 'idle'
let lastSyncResult: SyncResult | null = null

/**
 * Subscribe to sync events
 */
export function onSyncEvent(handler: SyncEventHandler): () => void {
  syncListeners.add(handler)
  return () => {
    syncListeners.delete(handler)
  }
}

/**
 * Emit sync event to all listeners
 */
function emitSyncEvent(result: SyncResult): void {
  lastSyncResult = result
  syncListeners.forEach((handler) => {
    try {
      handler(result)
    } catch (error) {
      console.error('[SyncService] Error in sync event handler:', error)
    }
  })
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return currentSyncStatus
}

/**
 * Get last sync result
 */
export function getLastSyncResult(): SyncResult | null {
  return lastSyncResult
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Sync a single offline transaction
 */
async function syncTransaction(transaction: OfflineTransaction): Promise<boolean> {
  try {
    const response = await fetch(transaction.url, {
      method: transaction.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction.data),
    })

    if (response.ok) {
      await markAsSynced(transaction.id)
      return true
    } else {
      const errorText = await response.text()
      await markAsFailed(transaction.id, `HTTP ${response.status}: ${errorText}`)
      return false
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await markAsFailed(transaction.id, errorMessage)
    return false
  }
}

/**
 * Sync all pending offline transactions
 */
export async function syncAllPending(): Promise<SyncResult> {
  if (!isOnline()) {
    const result: SyncResult = {
      status: 'error',
      synced: 0,
      failed: 0,
      total: 0,
      errors: [{ id: 'network', error: 'Device is offline' }],
    }
    emitSyncEvent(result)
    return result
  }

  if (currentSyncStatus === 'syncing') {
    return lastSyncResult || {
      status: 'syncing',
      synced: 0,
      failed: 0,
      total: 0,
      errors: [],
    }
  }

  currentSyncStatus = 'syncing'
  const errors: Array<{ id: string; error: string }> = []

  try {
    const pendingTransactions = await getPendingTransactions()
    const total = pendingTransactions.length

    if (total === 0) {
      const result: SyncResult = {
        status: 'success',
        synced: 0,
        failed: 0,
        total: 0,
        errors: [],
      }
      currentSyncStatus = 'idle'
      emitSyncEvent(result)
      return result
    }

    let synced = 0
    let failed = 0

    // Sync transactions sequentially to maintain order
    for (const transaction of pendingTransactions) {
      const success = await syncTransaction(transaction)
      if (success) {
        synced++
      } else {
        failed++
        errors.push({
          id: transaction.id,
          error: transaction.error || 'Unknown error',
        })
      }
    }

    const result: SyncResult = {
      status: failed === 0 ? 'success' : 'error',
      synced,
      failed,
      total,
      errors,
    }

    currentSyncStatus = failed === 0 ? 'idle' : 'error'
    emitSyncEvent(result)

    // Clean up synced transactions after successful sync
    if (synced > 0) {
      await clearSyncedTransactions()
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const result: SyncResult = {
      status: 'error',
      synced: 0,
      failed: 0,
      total: 0,
      errors: [{ id: 'sync', error: errorMessage }],
    }
    currentSyncStatus = 'error'
    emitSyncEvent(result)
    return result
  }
}

/**
 * Request background sync via Service Worker
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-transactions')
      return true
    }
  } catch (error) {
    console.error('[SyncService] Failed to register background sync:', error)
  }

  return false
}

/**
 * Listen for online/offline events and trigger sync
 */
export function setupAutoSync(): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => {
    console.log('[SyncService] Device is online, syncing...')
    syncAllPending()
  }

  const handleOffline = () => {
    console.log('[SyncService] Device is offline')
    currentSyncStatus = 'idle'
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Also listen to Service Worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[SyncService] Background sync complete')
        syncAllPending() // Update local state
      }
    })
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Send message to Service Worker
 */
export async function sendMessageToSW(message: Record<string, unknown>): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  if (registration.active) {
    registration.active.postMessage(message)
  }
}

/**
 * Request immediate sync from Service Worker
 */
export async function requestImmediateSync(): Promise<void> {
  await sendMessageToSW({ type: 'SYNC_NOW' })
}
