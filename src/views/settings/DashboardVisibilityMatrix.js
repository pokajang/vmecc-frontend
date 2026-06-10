import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { Lock, Pencil, Save } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import ButtonLoader from 'src/components/ButtonLoader'
import TableLoader from 'src/components/TableLoader'
import { DASHBOARD_VISIBILITY_ROWS } from 'src/constants/dashboardVisibility'
import { fetchRolePermissions, fetchSession, saveRolePermissions } from 'src/services/apiClient'
import { hasPermission } from 'src/utils/authz'

const LOCKED_ROLE = 'System Administrator'

const DashboardVisibilityMatrix = () => {
  const authUser = useSelector((state) => state.authUser)
  const canManage = useMemo(() => hasPermission(authUser, 'settings.manage'), [authUser])
  const dispatch = useDispatch()
  const toaster = useRef()
  const [toast, addToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState(null)
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [serverMatrix, setServerMatrix] = useState({})
  const [localMatrix, setLocalMatrix] = useState({})

  const pushToast = useCallback((message, { title = '', color = 'light' } = {}) => {
    addToast(
      <CToast autohide delay={4000} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRolePermissions()
      setRoles(data.roles || [])
      setPermissions(data.permissions || [])
      setServerMatrix(data.matrix || {})
      const sets = {}
      Object.entries(data.matrix || {}).forEach(([role, perms]) => {
        sets[role] = new Set(Array.isArray(perms) ? perms : [])
      })
      setLocalMatrix(sets)
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard visibility.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visibleRows = useMemo(
    () => DASHBOARD_VISIBILITY_ROWS.filter((row) => permissions.includes(row.permission)),
    [permissions],
  )

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

  const cancel = useCallback(() => {
    const reset = {}
    Object.entries(serverMatrix).forEach(([role, perms]) => {
      reset[role] = new Set(Array.isArray(perms) ? perms : [])
    })
    setLocalMatrix(reset)
    setEditMode(false)
  }, [serverMatrix])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const matrix = {}
      Object.entries(localMatrix).forEach(([role, set]) => {
        if (role === LOCKED_ROLE) return
        matrix[role] = Array.from(set)
      })
      const result = await saveRolePermissions(matrix)
      const nextServerMatrix = {}
      Object.entries(localMatrix).forEach(([role, set]) => {
        nextServerMatrix[role] = Array.from(set)
      })
      setServerMatrix(nextServerMatrix)
      setEditMode(false)

      pushToast(
        result?.changed?.length
          ? `Dashboard visibility updated for: ${result.changed.join(', ')}.`
          : 'No dashboard visibility changes were made.',
        {
          title: 'Dashboard Visibility',
          color: result?.changed?.length ? 'success' : 'light',
        },
      )

      try {
        const session = await fetchSession()
        const nextAuthUser = session?.user || session
        if (nextAuthUser) {
          dispatch({ type: 'set', authUser: nextAuthUser })
        }
      } catch {
        // Non-fatal
      }
    } catch (err) {
      pushToast(err?.message || 'Failed to save dashboard visibility.', {
        title: 'Error',
        color: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }, [dispatch, localMatrix, pushToast])

  if (!canManage) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage dashboard visibility.
      </CAlert>
    )
  }

  return (
    <>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="fw-semibold">Dashboard Visibility</div>
            <div className="small text-muted">
              This is a filtered view of the same role permission matrix for dashboard sections
              only.
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {editMode ? (
              <>
                <CButton
                  size="sm"
                  className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                  onClick={save}
                  disabled={loading || saving}
                >
                  {saving ? (
                    <ButtonLoader label="Saving..." size={13} />
                  ) : (
                    <Save size={13} className="me-1 align-text-bottom" />
                  )}
                  {!saving ? 'Save' : null}
                </CButton>
                <CButton
                  size="sm"
                  className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                  onClick={cancel}
                  disabled={saving}
                >
                  Cancel
                </CButton>
              </>
            ) : (
              <CButton
                size="sm"
                className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                onClick={() => setEditMode(true)}
                disabled={loading}
              >
                <Pencil size={13} className="me-1 align-text-bottom" />
                Edit
              </CButton>
            )}
          </div>
        </div>

        {loading && <TableLoader />}

        {!loading && error && (
          <CAlert color="danger" className="mb-0">
            {error}
          </CAlert>
        )}

        {!loading && !error && visibleRows.length === 0 && (
          <CAlert color="warning" className="mb-0">
            Dashboard visibility permissions are not available yet.
          </CAlert>
        )}

        {!loading && !error && visibleRows.length > 0 && (
          <div className="rounded-3 shadow-sm overflow-hidden bg-white mt-2">
            <div style={{ overflowX: 'auto' }}>
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell
                      className="align-middle"
                      style={{
                        minWidth: 260,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        background: '#f8f9fa',
                      }}
                    >
                      Dashboard Section
                    </CTableHeaderCell>
                    {roles.map((role) => (
                      <CTableHeaderCell
                        key={role}
                        className="text-center align-middle"
                        style={{ minWidth: 140 }}
                      >
                        {role === LOCKED_ROLE && (
                          <Lock size={12} className="me-1 text-muted align-text-bottom" />
                        )}
                        {role}
                      </CTableHeaderCell>
                    ))}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {visibleRows.map((row) => (
                    <CTableRow key={row.permission}>
                      <CTableDataCell
                        className="align-middle"
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          background: '#fff',
                        }}
                      >
                        <div className="fw-medium">{row.title}</div>
                        <div className="text-muted small">{row.description}</div>
                        <div className="text-muted small">{row.permission}</div>
                      </CTableDataCell>
                      {roles.map((role) => {
                        const isLocked = role === LOCKED_ROLE
                        const checked = isLocked
                          ? true
                          : (localMatrix[role] || new Set()).has(row.permission)
                        const wasChecked = isLocked
                          ? true
                          : new Set(serverMatrix[role] || []).has(row.permission)
                        const changed = !isLocked && checked !== wasChecked

                        return (
                          <CTableDataCell
                            key={`${role}-${row.permission}`}
                            className="text-center align-middle"
                            style={{
                              background: changed ? (checked ? '#d1f5d3' : '#fde8e8') : undefined,
                            }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={checked}
                              disabled={isLocked || !editMode || saving}
                              onChange={() => togglePermission(role, row.permission)}
                              aria-label={`${role} - ${row.title}`}
                              style={{ cursor: isLocked || !editMode ? 'default' : 'pointer' }}
                            />
                          </CTableDataCell>
                        )
                      })}
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default DashboardVisibilityMatrix
