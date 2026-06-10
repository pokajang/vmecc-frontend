import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchUsers } from 'src/services/apiClient'
import { buildStaffOptionsFromUsers } from 'src/utils/staffSelect'

const useStaffDirectory = ({ enabled = true, excludedRoles } = {}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [optionsAll, setOptionsAll] = useState([])

  const refresh = useCallback(async () => {
    if (!enabled) {
      setOptionsAll([])
      setError('')
      setLoading(false)
      return { ok: true, data: [] }
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetchUsers({ include_deleted: 1 })
      const next = buildStaffOptionsFromUsers(response?.data || [], { excludedRoles })
      setOptionsAll(next)
      return { ok: true, data: next }
    } catch (err) {
      setOptionsAll([])
      setError(err?.message || 'Unable to load staff directory.')
      return { ok: false, data: [] }
    } finally {
      setLoading(false)
    }
  }, [enabled, excludedRoles])

  useEffect(() => {
    refresh()
  }, [refresh])

  const optionsActiveOnly = useMemo(
    () => optionsAll.filter((row) => row?.isActive !== false),
    [optionsAll],
  )

  const findOptionByKey = useCallback(
    (key) => optionsAll.find((row) => String(row?.key || '') === String(key || '')) || null,
    [optionsAll],
  )

  return {
    loading,
    error,
    optionsAll,
    optionsActiveOnly,
    refresh,
    findOptionByKey,
  }
}

export default useStaffDirectory
