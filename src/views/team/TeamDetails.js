import { useCallback, useEffect, useState } from 'react'
import { CAlert, CCard, CCardBody, CCardHeader, CCol, CContainer, CRow } from '@coreui/react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TeamCard from './components/TeamCard'
import EditTeamModal from './components/EditTeamModal'
import CreateTeamModal from './components/CreateTeamModal'
import TableLoader from 'src/components/TableLoader'
import {
  fetchTeams,
  fetchUsers,
  fetchShiftWindows,
  fetchRosters,
  createTeam,
} from 'src/services/apiClient'
import CreateActionButton from 'src/components/CreateActionButton'
import { hasPermission } from 'src/utils/authz'
import { resolveTeamScheduleStatusMap } from './components/teamScheduleStatus'

const TeamDetails = () => {
  const authUser = useSelector((state) => state.authUser)
  const canViewTeams = hasPermission(authUser, 'teams.view')
  const canManageTeams = hasPermission(authUser, 'teams.manage')

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusMap, setStatusMap] = useState({})
  const [members, setMembers] = useState([])
  const [assignedUserIds, setAssignedUserIds] = useState(new Set())
  const [editTeam, setEditTeam] = useState(null)
  const [editTeamStatus, setEditTeamStatus] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const loadPageData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [teamsResp, shiftResp, rosterResp] = await Promise.all([
        fetchTeams(),
        fetchShiftWindows().catch(() => null),
        fetchRosters({ status: 'published' }).catch(() => null),
      ])

      const data = teamsResp?.data || []
      setTeams(data)

      const taken = new Set()
      data.forEach((t) =>
        (t.members || []).forEach((m) => {
          if (m.user_id) taken.add(m.user_id)
        }),
      )
      setAssignedUserIds(taken)

      const windows = shiftResp?.data
      const rosterRows = rosterResp?.data || []
      setStatusMap(
        resolveTeamScheduleStatusMap({
          teams: data,
          rosterRows,
          shiftWindows: windows,
        }),
      )
    } catch (err) {
      setError(err.payload?.message || 'Unable to load teams.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    if (canViewTeams) {
      loadPageData()
      loadMembers()
    } else {
      setLoading(false)
      setMembersLoading(false)
    }
  }, [canViewTeams, loadPageData, loadMembers])

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span>Team Details</span>
              {canManageTeams && (
                <CreateActionButton label="Add teams" onClick={() => setShowCreate(true)} />
              )}
            </CCardHeader>
            <CCardBody>
              {!loading && error && <CAlert color="danger">{error}</CAlert>}
              {!loading && !canViewTeams && (
                <CAlert color="warning" className="mb-0">
                  You don&apos;t have permission to view teams.
                </CAlert>
              )}
              {loading ? (
                <CRow className="g-3">
                  {[0, 1, 2, 3].map((i) => (
                    <CCol key={i} xs={12} md={6} lg={3}>
                      <div className="rounded-3 shadow-sm overflow-hidden">
                        <div style={{ height: 80, background: 'var(--cui-tertiary-bg)' }} />
                        <TableLoader />
                      </div>
                    </CCol>
                  ))}
                </CRow>
              ) : teams.length === 0 ? (
                <CRow className="g-3">
                  <CCol xs={12}>
                    <p className="text-body-secondary mb-1">No teams found.</p>
                    {canManageTeams && (
                      <p className="text-body-secondary small mb-0">
                        Use <strong>Add teams</strong> above to create Alpha, Bravo, Charlie, and
                        Delta teams.
                      </p>
                    )}
                  </CCol>
                </CRow>
              ) : (
                (() => {
                  const hasGroups = teams.some((t) => t.group)
                  const groupMap = {}
                  teams.forEach((t) => {
                    const key = t.group || 'Default'
                    if (!groupMap[key]) groupMap[key] = []
                    groupMap[key].push(t)
                  })
                  const groupKeys = [
                    'Default',
                    ...Object.keys(groupMap).filter((k) => k !== 'Default'),
                  ].filter((k) => groupMap[k])
                  const renderCard = (team) => (
                    <CCol key={team.id} xs={12} md={6} lg={3}>
                      <TeamCard
                        team={team}
                        status={statusMap[team.id]}
                        onView={() => navigate(`/team/details/${team.id}`)}
                        onEdit={() => {
                          if (!canManageTeams) return
                          setEditTeam(team)
                          setEditTeamStatus(statusMap[team.id] || null)
                          setShowEdit(true)
                        }}
                        canEdit={canManageTeams}
                      />
                    </CCol>
                  )
                  if (!hasGroups) return <CRow className="g-3">{teams.map(renderCard)}</CRow>
                  return groupKeys.map((groupKey) => (
                    <div key={groupKey} className="mb-4">
                      <div
                        className="text-muted small fw-semibold mb-2"
                        style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      >
                        {groupKey}
                      </div>
                      <CRow className="g-3">{groupMap[groupKey].map(renderCard)}</CRow>
                    </div>
                  ))
                })()
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      <CreateTeamModal
        visible={showCreate}
        existingTeams={teams.map((t) => t.name)}
        onClose={() => setShowCreate(false)}
        onSaved={async (names) => {
          await Promise.all(names.map((name) => createTeam({ name })))
          setShowCreate(false)
          loadPageData()
        }}
      />
      {editTeam && (
        <EditTeamModal
          visible={showEdit}
          team={editTeam}
          rosterStatus={editTeamStatus}
          membersSource={members}
          loadingMembers={membersLoading}
          assignedUserIds={assignedUserIds}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            setEditTeam(null)
            setEditTeamStatus(null)
            loadPageData()
          }}
          onDeleted={(deletedId) => {
            // Capture members before clearing editTeam
            const deletedMembers = editTeam?.members || []
            setShowEdit(false)
            setEditTeam(null)
            setEditTeamStatus(null)
            setTeams((prev) => prev.filter((t) => t.id !== deletedId))
            setAssignedUserIds((prev) => {
              const next = new Set(prev)
              // members of the deleted team are no longer assigned
              deletedMembers.forEach((m) => {
                if (m.user_id) next.delete(m.user_id)
              })
              return next
            })
          }}
        />
      )}
    </CContainer>
  )
}

export default TeamDetails
