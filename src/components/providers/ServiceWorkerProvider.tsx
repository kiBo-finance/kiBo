'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  setupAutoSync,
  syncAllPending,
  onSyncEvent,
  isOnline as checkOnline,
  type SyncResult,
  type SyncStatus,
} from '../../lib/sync-service'
import { getPendingCount } from '../../lib/offline-store'

interface ServiceWorkerContextValue {
  isOnline: boolean
  isServiceWorkerReady: boolean
  pendingCount: number
  syncStatus: SyncStatus
  lastSyncResult: SyncResult | null
  syncNow: () => Promise<void>
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue>({
  isOnline: true,
  isServiceWorkerReady: false,
  pendingCount: 0,
  syncStatus: 'idle',
  lastSyncResult: null,
  syncNow: async () => {},
})

export function useServiceWorker() {
  return useContext(ServiceWorkerContext)
}

interface ServiceWorkerProviderProps {
  children: ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  // Register Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        })

        console.log('[PWA] Service Worker registered:', registration.scope)
        setIsServiceWorkerReady(true)

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker installed')
              }
            })
          }
        })
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [])

  // Setup online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(checkOnline())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Setup auto sync
  useEffect(() => {
    const cleanup = setupAutoSync()
    return cleanup
  }, [])

  // Listen to sync events
  useEffect(() => {
    const unsubscribe = onSyncEvent((result) => {
      setSyncStatus(result.status)
      setLastSyncResult(result)
      updatePendingCount()
    })

    return unsubscribe
  }, [])

  // Update pending count
  const updatePendingCount = async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch (error) {
      console.error('[PWA] Failed to get pending count:', error)
    }
  }

  // Initial pending count
  useEffect(() => {
    updatePendingCount()
  }, [])

  // Sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAllPending()
    }
  }, [isOnline, pendingCount])

  const syncNow = async () => {
    setSyncStatus('syncing')
    await syncAllPending()
    await updatePendingCount()
  }

  const value: ServiceWorkerContextValue = {
    isOnline,
    isServiceWorkerReady,
    pendingCount,
    syncStatus,
    lastSyncResult,
    syncNow,
  }

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
    </ServiceWorkerContext.Provider>
  )
}
