import { useCallback, useEffect, useState } from 'react'
import { getInspectionOfflineHealth } from 'src/views/inspection/inspectionOfflineHealth'

const useInspectionOfflineHealthController = ({
  userId,
  queueRowsCount,
  warningShownRef,
  pushToast,
}) => {
  const [offlineHealth, setOfflineHealth] = useState(null)
  const [isOfflineHealthLoading, setIsOfflineHealthLoading] = useState(false)
  const [isRefreshingOfflineAssets, setIsRefreshingOfflineAssets] = useState(false)

  const refreshOfflineHealth = useCallback(async () => {
    if (!userId) {
      setOfflineHealth(null)
      return null
    }
    setIsOfflineHealthLoading(true)
    try {
      const health = await getInspectionOfflineHealth(userId)
      setOfflineHealth(health)
      return health
    } finally {
      setIsOfflineHealthLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const health = await refreshOfflineHealth()
      if (cancelled || !health?.warnings?.length || warningShownRef.current) return
      warningShownRef.current = true
      pushToast(health.warnings.join(', '), {
        title: 'Offline readiness',
        color: 'warning',
        delay: 7000,
      })
    }
    run()
    return () => {
      cancelled = true
    }
  }, [queueRowsCount, refreshOfflineHealth, pushToast, warningShownRef])

  return {
    offlineHealth,
    isOfflineHealthLoading,
    isRefreshingOfflineAssets,
    setIsRefreshingOfflineAssets,
    refreshOfflineHealth,
  }
}

export default useInspectionOfflineHealthController
