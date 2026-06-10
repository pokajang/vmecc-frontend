import { useEffect, useState } from 'react'
import { fetchMyDashboardStats } from 'src/services/apiClient'

const useMyStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMyDashboardStats()
      .then((res) => {
        if (!cancelled) {
          setStats(res?.data ?? null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { stats, loading, error }
}

export default useMyStats
