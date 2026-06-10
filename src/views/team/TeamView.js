import { useCallback, useEffect, useState } from 'react'
import { CAlert, CCol, CContainer, CRow } from '@coreui/react'
import { Pencil } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import TableLoader from 'src/components/TableLoader'
import StatusPill from './components/StatusPill'
import EditTeamModal from './components/EditTeamModal'
import { fetchTeam, fetchShiftWindows, fetchRosters, fetchUsers } from 'src/services/apiClient'
import { resolveImageUrl } from './components/teamImageUtils'
import { getRoleBadge } from './components/teamRoleUtils'
import { resolveTeamScheduleStatus } from './components/teamScheduleStatus'
import { hasPermission, hasScopedPermission } from 'src/utils/authz'

const formatDuration = (startStr, endStr) => {
  const start = startStr ? new Date(startStr) : null
  const end = endStr ? new Date(endStr) : new Date()
  if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const diffDays = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const months = Math.floor(diffDays / 30)
  const days = diffDays % 30
  const parts = []
  if (months) parts.push(`${months}m`)
  if (days || !parts.length) parts.push(`${days}d`)
  return parts.join(' ')
}

const AVATAR_COLORS = {
  a: { bg: '#eef2ff', text: '#4338ca' },
  b: { bg: '#ecfdf5', text: '#059669' },
  c: { bg: '#fffbeb', text: '#d97706' },
  d: { bg: '#fff1f2', text: '#e11d48' },
}

const getAvatarColors = (name) => {
  const key = (name || '').trim().toLowerCase().charAt(0)
  return AVATAR_COLORS[key] || { bg: '#f1f5f9', text: '#475569' }
}

const TeamView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const authUser = useSelector((state) => state.authUser)
  const canViewTeams = hasPermission(authUser, 'teams.view')
  const canManageTeams = hasPermission(authUser, 'teams.manage')
  const canViewRequestedTeam = hasScopedPermission(authUser, 'teams.view', id)

  const [team, setTeam] = useState(null)
  const [status, setStatus] = useState('Unscheduled')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [assignedUserIds, setAssignedUserIds] = useState(new Set())

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [teamResp, shiftResp, rosterResp] = await Promise.all([
        fetchTeam(id),
        fetchShiftWindows().catch(() => null),
        fetchRosters({ status: 'published' }).catch(() => null),
      ])

      const teamData = teamResp?.data || null
      setTeam(teamData)

      if (teamData) {
        const windows = shiftResp?.data
        const rosterRows = rosterResp?.data || []
        setStatus(resolveTeamScheduleStatus({ team: teamData, rosterRows, shiftWindows: windows }))
        // Build assignedUserIds from this team's members only
        const taken = new Set((teamData.members || []).map((m) => m.user_id).filter(Boolean))
        setAssignedUserIds(taken)
      }
    } catch (err) {
      setError(err.payload?.message || 'Unable to load team.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const resp = await fetchUsers()
      setMembers(resp?.data || [])
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canViewRequestedTeam) {
      setLoading(false)
      return
    }
    loadTeam()
  }, [canViewRequestedTeam, loadTeam])

  // Load members lazily when edit modal is first opened
  const handleOpenEdit = () => {
    if (members.length === 0) loadMembers()
    setShowEdit(true)
  }

  if (loading) {
    return (
      <CContainer fluid>
        <CRow className="g-3">
          <CCol md={6} lg={5} xl={4}>
            <div
              className="rounded-3 shadow-sm overflow-hidden"
              style={{ border: '1px solid var(--cui-border-color)' }}
            >
              <div style={{ height: 120, background: 'var(--cui-tertiary-bg)' }} />
              <TableLoader />
            </div>
          </CCol>
          <CCol md={6} lg={7} xl={8}>
            <div
              className="rounded-3 shadow-sm overflow-hidden mb-3"
              style={{ border: '1px solid var(--cui-border-color)' }}
            >
              <TableLoader />
            </div>
            <div
              className="rounded-3 shadow-sm overflow-hidden"
              style={{ border: '1px solid var(--cui-border-color)' }}
            >
              <TableLoader />
            </div>
          </CCol>
        </CRow>
        <FormActionGroup className="mt-3" leading={<BackButton onClick={() => navigate(-1)} />} />
      </CContainer>
    )
  }

  if (!canViewTeams || !canViewRequestedTeam) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to view this team.
      </CAlert>
    )
  }

  if (error) {
    return (
      <CAlert color="danger" className="my-4">
        {error}
      </CAlert>
    )
  }

  if (!team) {
    return (
      <CAlert color="warning" className="my-4">
        Team not found.
      </CAlert>
    )
  }

  const imageUrl = resolveImageUrl(team.image_url)
  const { bg, text: avatarText } = getAvatarColors(team.name)
  const initial = (team.name || '?').trim().charAt(0).toUpperCase()

  const activeMembers = Array.isArray(team.members) ? [...team.members] : []
  activeMembers.sort((a, b) => {
    const rank = (m) => {
      const r = (m.role || '').toLowerCase()
      if (r.includes('incident commander') && !r.includes('assistant')) return 0
      if (r.includes('assistant incident commander')) return 1
      return 2
    }
    const dr = rank(a) - rank(b)
    if (dr !== 0) return dr
    return (a.name || '').localeCompare(b.name || '')
  })

  const pastMembers = Array.isArray(team.past_members) ? [...team.past_members] : []
  pastMembers.sort((a, b) => {
    if (a.ended_at && b.ended_at) return b.ended_at.localeCompare(a.ended_at)
    return 0
  })

  return (
    <CContainer fluid>
      <CRow className="g-3">
        {/* Left: team identity card */}
        <CCol md={6} lg={5} xl={4}>
          <div
            className="rounded-3 shadow-sm overflow-hidden"
            style={{
              border: '1px solid var(--cui-border-color)',
              background: 'var(--cui-body-bg)',
            }}
          >
            {/* Image or avatar */}
            {imageUrl ? (
              <div
                style={{
                  height: 200,
                  background: '#0f0f0f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={imageUrl}
                  alt={team.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 120,
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{ fontSize: '3rem', fontWeight: 700, color: avatarText, lineHeight: 1 }}
                >
                  {initial}
                </span>
              </div>
            )}

            {/* Name + status */}
            <div className="px-4 py-3 d-flex flex-column gap-2">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-semibold fs-5">{team.name || '--'}</span>
                  <StatusPill label={status} />
                </div>
                {canManageTeams && (
                  <div
                    role="button"
                    onClick={handleOpenEdit}
                    className="text-muted p-1 rounded d-inline-flex align-items-center"
                    style={{ cursor: 'pointer', lineHeight: 1 }}
                    title="Edit team"
                  >
                    <Pencil size={14} />
                  </div>
                )}
              </div>
              {team.lead_name && <div className="text-muted small">Lead: {team.lead_name}</div>}
            </div>
          </div>
        </CCol>

        {/* Right: members */}
        <CCol md={6} lg={7} xl={8}>
          {/* Active members */}
          <div
            className="rounded-3 shadow-sm overflow-hidden mb-3"
            style={{
              border: '1px solid var(--cui-border-color)',
              background: 'var(--cui-body-bg)',
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 fw-semibold small"
              style={{
                background: 'var(--cui-tertiary-bg)',
                borderBottom: '1px solid var(--cui-border-color)',
              }}
            >
              Team Members
              {activeMembers.length > 0 && (
                <span className="ms-2 fw-normal text-muted">({activeMembers.length})</span>
              )}
            </div>

            {activeMembers.length > 0 ? (
              activeMembers.map((member, idx) => {
                const roleTag = getRoleBadge(member.role)
                const duration = formatDuration(member.started_at, null)
                return (
                  <div
                    key={member.id}
                    className="d-flex justify-content-between align-items-center px-3 py-2"
                    style={{
                      borderBottom:
                        idx < activeMembers.length - 1
                          ? '1px solid var(--cui-border-color)'
                          : 'none',
                    }}
                  >
                    <div className="d-grid gap-1">
                      <span className="fw-medium">{member.name || '--'}</span>
                      <span className="text-muted small">
                        {member.started_at ? `Since ${member.started_at}` : 'No start date'}
                        {duration ? ` - ${duration}` : ''}
                      </span>
                    </div>
                    {roleTag ? (
                      <span
                        className="px-2 py-1 rounded-pill fw-semibold ms-3"
                        style={{
                          background: roleTag.bg,
                          color: roleTag.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {roleTag.label}
                      </span>
                    ) : (
                      <span className="text-muted ms-3" style={{ whiteSpace: 'nowrap' }}>
                        {member.role || '--'}
                      </span>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="px-3 py-3 text-muted small">No active members.</div>
            )}
          </div>

          {/* Past members */}
          <div
            className="rounded-3 shadow-sm overflow-hidden"
            style={{
              border: '1px solid var(--cui-border-color)',
              background: 'var(--cui-body-bg)',
            }}
          >
            <div
              className="px-3 py-2 fw-semibold small"
              style={{
                background: 'var(--cui-tertiary-bg)',
                borderBottom: '1px solid var(--cui-border-color)',
              }}
            >
              Past Members
              {pastMembers.length > 0 && (
                <span className="ms-2 fw-normal text-muted">({pastMembers.length})</span>
              )}
            </div>

            {pastMembers.length > 0 ? (
              pastMembers.map((member, idx) => {
                const duration = formatDuration(member.started_at, member.ended_at)
                return (
                  <div
                    key={member.id}
                    className="d-flex justify-content-between align-items-center px-3 py-2"
                    style={{
                      borderBottom:
                        idx < pastMembers.length - 1 ? '1px solid var(--cui-border-color)' : 'none',
                    }}
                  >
                    <div className="d-grid gap-1">
                      <span className="fw-medium text-muted">{member.name || '--'}</span>
                      <span className="text-muted small">
                        {member.started_at || '--'}
                        {' -> '}
                        {member.ended_at || '--'}
                        {duration ? ` - ${duration}` : ''}
                      </span>
                    </div>
                    <span className="text-muted ms-3" style={{ whiteSpace: 'nowrap' }}>
                      {member.role || '--'}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="px-3 py-3 text-muted small">No past members on record.</div>
            )}
          </div>
        </CCol>
      </CRow>

      <FormActionGroup className="mt-3" leading={<BackButton onClick={() => navigate(-1)} />} />

      {canManageTeams && team && (
        <EditTeamModal
          visible={showEdit}
          team={team}
          rosterStatus={status}
          membersSource={members}
          loadingMembers={membersLoading}
          assignedUserIds={assignedUserIds}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            loadTeam()
          }}
          onDeleted={() => {
            setShowEdit(false)
            navigate('/team/details')
          }}
        />
      )}
    </CContainer>
  )
}

export default TeamView
