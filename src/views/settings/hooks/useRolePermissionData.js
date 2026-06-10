import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { fetchRolePermissions, fetchSession, saveRolePermissions } from 'src/services/apiClient'
import { LOCKED_ROLE } from '../rolePermissionDomain'

const matrixToSets = (matrix = {}) => {
  const sets = {}
  for (const [role, perms] of Object.entries(matrix || {})) {
    sets[role] = new Set(Array.isArray(perms) ? perms : [])
  }
  return sets
}

const useRolePermissionData = ({ editMode, setEditMode, setChangesOnly, pushToast }) => {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])
  const [serverMatrix, setServerMatrix] = useState({})
  const [localMatrix, setLocalMatrix] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRolePermissions()
      setPermissions(data.permissions || [])
      setRoles(data.roles || [])
      setServerMatrix(data.matrix || {})
      setLocalMatrix(matrixToSets(data.matrix || {}))
    } catch (err) {
      setError(err?.message || 'Failed to load permissions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cancel = useCallback(() => {
    setLocalMatrix(matrixToSets(serverMatrix))
    setEditMode(false)
    setChangesOnly(false)
  }, [serverMatrix, setChangesOnly, setEditMode])

  const togglePermission = useCallback(
    (role, permission) => {
      if (role === LOCKED_ROLE || !editMode) return
      setLocalMatrix((prev) => {
        const next = { ...prev }
        const set = new Set(prev[role] || [])
        if (set.has(permission)) {
          set.delete(permission)
        } else {
          set.add(permission)
        }
        next[role] = set
        return next
      })
    },
    [editMode],
  )

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const matrix = {}
      for (const [role, set] of Object.entries(localMatrix)) {
        if (role === LOCKED_ROLE) continue
        matrix[role] = Array.from(set)
      }
      const result = await saveRolePermissions(matrix)

      setServerMatrix((prev) => {
        const next = { ...prev }
        for (const [role, perms] of Object.entries(matrix)) {
          next[role] = perms
        }
        return next
      })

      setEditMode(false)
      setChangesOnly(false)

      const changedCount = result?.changed?.length ?? 0
      pushToast(
        changedCount > 0
          ? `Permissions updated for: ${result.changed.join(', ')}.`
          : 'No changes were made.',
        { title: 'Role Permissions', color: changedCount > 0 ? 'success' : 'light' },
      )

      try {
        const session = await fetchSession()
        const nextAuthUser = session?.user || session
        if (nextAuthUser) {
          dispatch({ type: 'set', authUser: nextAuthUser })
        }
      } catch {
        // Session refresh is best-effort after permission updates.
      }
    } catch (err) {
      pushToast(err?.message || 'Failed to save permissions.', {
        title: 'Error',
        color: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }, [localMatrix, dispatch, pushToast, setChangesOnly, setEditMode])

  return {
    cancel,
    error,
    loading,
    localMatrix,
    permissions,
    roles,
    save,
    saving,
    serverMatrix,
    togglePermission,
  }
}

export default useRolePermissionData
