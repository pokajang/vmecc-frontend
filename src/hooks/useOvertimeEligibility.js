import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { loadMyOvertimeEligibilityApiFirst } from 'src/services/overtimeApi'

const DEFAULT_ELIGIBILITY = {
  eligible: true,
  applicableRoles: [],
  userRoles: [],
}

let eligibilityCache = null
let eligibilityPromise = null

const normalizeEligibility = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  return {
    eligible: source.eligible === true,
    applicableRoles: Array.isArray(source.applicableRoles) ? source.applicableRoles : [],
    userRoles: Array.isArray(source.userRoles) ? source.userRoles : [],
  }
}

export const clearOvertimeEligibilityCache = () => {
  eligibilityCache = null
  eligibilityPromise = null
}

const useOvertimeEligibility = ({ enabled = true } = {}) => {
  const authUser = useSelector((state) => state.authUser)
  const userId = String(authUser?.id || '').trim()

  const [data, setData] = useState(DEFAULT_ELIGIBILITY)
  const [isLoading, setIsLoading] = useState(Boolean(enabled && userId))
  const [isResolved, setIsResolved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const hydrate = async () => {
      if (!enabled || !userId) {
        if (!active) return
        setData(DEFAULT_ELIGIBILITY)
        setIsLoading(false)
        setIsResolved(false)
        setError(null)
        return
      }

      if (eligibilityCache && eligibilityCache.userId === userId) {
        if (!active) return
        setData(eligibilityCache.data)
        setIsLoading(false)
        setIsResolved(true)
        setError(null)
        return
      }

      setIsLoading(true)
      setIsResolved(false)
      setError(null)

      if (!eligibilityPromise || eligibilityPromise.userId !== userId) {
        const request = loadMyOvertimeEligibilityApiFirst()
        eligibilityPromise = { userId, request }
      }

      const result = await eligibilityPromise.request
      if (!active) return

      if (result?.ok && result?.data) {
        const normalized = normalizeEligibility(result.data)
        eligibilityCache = { userId, data: normalized }
        setData(normalized)
        setIsResolved(true)
        setError(null)
        setIsLoading(false)
        return
      }

      setData(DEFAULT_ELIGIBILITY)
      setIsResolved(false)
      setError(result?.error || new Error('Failed to load overtime eligibility'))
      setIsLoading(false)
    }

    hydrate()

    return () => {
      active = false
    }
  }, [enabled, userId])

  return useMemo(
    () => ({
      data,
      eligible: data.eligible === true,
      isIneligible: isResolved && data.eligible !== true,
      isLoading,
      isResolved,
      error,
    }),
    [data, error, isLoading, isResolved],
  )
}

export default useOvertimeEligibility
