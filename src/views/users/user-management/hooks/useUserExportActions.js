import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAuditLogs, fetchUserSessions } from 'src/services/apiClient'
import { exportWorkbook } from 'src/utils/exportXlsx'
import { EMPTY, formatDateTime, renderStatus, toSlug } from 'src/utils/users'

const formatAuditAction = (value) => {
  if (!value) return EMPTY
  return value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const getActorLabel = (log) => {
  if (log.actor?.name) return log.actor.name
  if (log.actor?.email) return log.actor.email
  return EMPTY
}

const getAuditDetails = (log) => {
  if (log.action === 'user_status_changed') {
    const from = log.metadata?.from || EMPTY
    const to = log.metadata?.to || EMPTY
    return `Status changed from ${from} to ${to}`
  }
  if (log.action === 'user_created') {
    const role = log.metadata?.role
    return role ? `User created with role ${role}` : 'User created'
  }
  if (log.action === 'user_role_changed') {
    const fromRoles = Array.isArray(log.metadata?.from_roles) ? log.metadata.from_roles : []
    const toRoles = Array.isArray(log.metadata?.to_roles) ? log.metadata.to_roles : []
    const fromLabel = fromRoles.length ? fromRoles.join(', ') : EMPTY
    const toLabel = toRoles.length ? toRoles.join(', ') : EMPTY
    return `Roles changed from ${fromLabel} to ${toLabel}`
  }
  if (log.action === 'password_reset_sent') {
    const method = log.metadata?.method || 'admin'
    return `Password reset sent (${method})`
  }
  if (log.action === 'user_deleted') return 'User deleted'
  if (log.action === 'user_permanently_deleted') return 'User permanently deleted'
  if (log.action === 'user_restored') return 'User restored'
  if (log.action === 'user_locked') return 'User locked'
  if (log.action === 'user_unlocked') return 'User unlocked'
  if (log.action === 'user_session_revoked') return 'Session revoked'
  if (log.action === 'user_sessions_revoked_all') return 'All sessions revoked'
  if (log.action === 'role_permissions_updated') {
    const changed = Array.isArray(log.metadata?.changed_roles) ? log.metadata.changed_roles : []
    if (changed.length === 0) return 'Role permissions updated (no changes)'
    return `Role permissions updated for: ${changed.join(', ')}`
  }
  return log.metadata?.note || EMPTY
}

const getExportRows = (filtered) =>
  filtered.map((u) => [
    u.id,
    u.name || '',
    u.email || '',
    (u.roles || []).join(', '),
    u.deleted_at ? 'Deleted' : u.status || '',
    u.locked_at ? 'Locked' : 'No',
    u.failed_login_count ?? 0,
    u.last_login_at || '',
    u.created_at || '',
  ])

const userExportHeaders = [
  'ID',
  'Name',
  'Email',
  'Roles',
  'Status',
  'Locked',
  'Failed Logins',
  'Last Login',
  'Created At',
]

const useUserExportActions = ({ filtered }) => {
  const [exportingUserId, setExportingUserId] = useState(null)
  const [exportMessage, setExportMessage] = useState(null)
  const exportTimerRef = useRef(null)

  const pushExportMessage = useCallback((type, message) => {
    setExportMessage({ type, message })
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
    exportTimerRef.current = setTimeout(() => setExportMessage(null), 3000)
  }, [])

  useEffect(
    () => () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
    },
    [],
  )

  const exportCsv = useCallback(() => {
    const rows = getExportRows(filtered)
    const escape = (value) => {
      const str = value === null || value === undefined ? '' : String(value)
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    const csv = [userExportHeaders, ...rows].map((row) => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filtered])

  const exportXlsx = useCallback(() => {
    exportWorkbook({
      sheets: [{ name: 'Users', headers: userExportHeaders, rows: getExportRows(filtered) }],
      filename: `users-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }, [filtered])

  const exportUserXlsx = useCallback(
    async (user) => {
      if (!user || exportingUserId) return
      setExportingUserId(user.id)
      try {
        const [sessionsRes, logsRes] = await Promise.all([
          fetchUserSessions(user.id),
          fetchAuditLogs({ subject_id: user.id, limit: 200 }),
        ])

        const loginHeaders = ['#', 'Time', 'Status', 'Reason', 'IP', 'Device']
        const loginRows = (user.login_records || []).map((record, index) => {
          const { label } = renderStatus(record.status)
          const when =
            record.timestamp || record.logged_at || record.created_at || record.time || null
          const reason = record.reason || record.error || EMPTY
          const ip = record.ip_address || EMPTY
          const device = record.device_info || record.user_agent || record.device_id || EMPTY
          return [index + 1, formatDateTime(when), label, reason, ip, device]
        })

        const sessions = sessionsRes?.data || []
        const sessionHeaders = ['#', 'Status', 'Device', 'IP', 'Created', 'Last seen', 'Expires']
        const sessionRows = sessions.map((session, index) => {
          const status = session.active
            ? 'Active'
            : session.revoked_at || session.logged_out_at
              ? 'Revoked'
              : 'Expired'
          return [
            index + 1,
            status,
            session.user_agent || '-',
            session.ip_address || '-',
            formatDateTime(session.created_at),
            formatDateTime(session.last_seen_at),
            formatDateTime(session.expires_at),
          ]
        })

        const logs = logsRes?.data || []
        const auditHeaders = ['#', 'Time', 'Action', 'Actor', 'IP', 'Details']
        const auditRows = logs.map((log, index) => [
          index + 1,
          formatDateTime(log.created_at),
          formatAuditAction(log.action),
          getActorLabel(log),
          log.ip_address || EMPTY,
          getAuditDetails(log),
        ])

        const slug = toSlug(user.name || user.email || 'user')
        exportWorkbook({
          sheets: [
            { name: 'Login Records', headers: loginHeaders, rows: loginRows },
            { name: 'Active Sessions', headers: sessionHeaders, rows: sessionRows },
            { name: 'Admin Activity (latest 200)', headers: auditHeaders, rows: auditRows },
          ],
          filename: `user-${slug}-activity-${new Date().toISOString().slice(0, 10)}.csv`,
        })
      } catch (err) {
        pushExportMessage('danger', err.payload?.message || 'Unable to export activity.')
      } finally {
        setExportingUserId(null)
      }
    },
    [exportingUserId, pushExportMessage],
  )

  return {
    exportingUserId,
    exportMessage,
    exportCsv,
    exportXlsx,
    exportUserXlsx,
  }
}

export default useUserExportActions
