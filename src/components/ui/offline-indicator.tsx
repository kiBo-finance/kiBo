'use client'

import { WifiOff } from 'lucide-react'
import { useServiceWorker } from '../providers/ServiceWorkerProvider'

export function OfflineIndicator() {
  const { isOnline } = useServiceWorker()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>オフラインモード - データはオンライン復帰時に同期されます</span>
    </div>
  )
}
