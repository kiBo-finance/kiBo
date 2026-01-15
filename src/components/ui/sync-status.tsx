'use client'

import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useServiceWorker } from '../providers/ServiceWorkerProvider'
import { Button } from './button'

interface SyncStatusProps {
  showLabel?: boolean
  compact?: boolean
}

export function SyncStatus({ showLabel = true, compact = false }: SyncStatusProps) {
  const { isOnline, pendingCount, syncStatus, syncNow } = useServiceWorker()

  const handleSync = async () => {
    await syncNow()
  }

  // Offline with pending items
  if (!isOnline && pendingCount > 0) {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20'}`}>
        <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        {showLabel && (
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {pendingCount}件の未同期データ
          </span>
        )}
      </div>
    )
  }

  // Syncing
  if (syncStatus === 'syncing') {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20'}`}>
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
        {showLabel && (
          <span className="text-sm text-blue-700 dark:text-blue-300">
            同期中...
          </span>
        )}
      </div>
    )
  }

  // Has pending items (online)
  if (pendingCount > 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        className={`flex items-center gap-2 ${compact ? 'p-1' : ''}`}
      >
        <Cloud className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        {showLabel && (
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {pendingCount}件を同期
          </span>
        )}
      </Button>
    )
  }

  // Sync error
  if (syncStatus === 'error') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        className={`flex items-center gap-2 ${compact ? 'p-1' : ''}`}
      >
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        {showLabel && (
          <span className="text-sm text-red-700 dark:text-red-300">
            同期エラー - 再試行
          </span>
        )}
      </Button>
    )
  }

  // All synced / online
  if (!compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        {showLabel && (
          <span className="text-sm text-green-700 dark:text-green-300">
            同期済み
          </span>
        )}
      </div>
    )
  }

  return null
}

/**
 * Compact sync indicator for header
 */
export function SyncIndicator() {
  const { isOnline, pendingCount, syncStatus, syncNow } = useServiceWorker()

  if (!isOnline) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        onClick={syncNow}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        title={`${pendingCount}件の未同期データを同期`}
      >
        <Cloud className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-amber-500 rounded-full">
          {pendingCount}
        </span>
      </button>
    )
  }

  if (syncStatus === 'error') {
    return (
      <button
        onClick={syncNow}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        title="同期エラー - クリックして再試行"
      >
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </button>
    )
  }

  return null
}
