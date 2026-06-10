import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CCol, CFormCheck, CRow } from '@coreui/react'
import { Users } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'
import TableLoader from 'src/components/TableLoader'
import { fetchRosters, fetchShiftWindows, fetchTeams } from 'src/services/apiClient'
import { DetailsStepActions } from './erco-form-components'
import { formatErcoLocation, resolveRespondingTeamLabel } from './utils'

const ACTIVE_CARD_BG = 'rgba(0, 126, 122, 0.2)'
const ACTIVE_CARD_BORDER = 'rgba(0, 126, 122, 0.45)'
const DEFAULT_SHIFT_WINDOWS = {
  day_start: '07:00',
  day_end: '19:00',
  night_start: '19:00',
  night_end: '07:00',
}

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const toMinutes = (value) => {
  const [h, m] = String(value || '00:00')
    .split(':')
    .map((n) => parseInt(n, 10))
  const hh = Number.isNaN(h) ? 0 : h
  const mm = Number.isNaN(m) ? 0 : m
  return hh * 60 + mm
}

const inRange = (current, start, end) => {
  if (start <= end) return current >= start && current < end
  return current >= start || current < end
}

const resolveShiftByTime = (incidentTime, windows) => {
  const current = toMinutes(incidentTime)
  const dayStart = toMinutes(windows?.day_start || DEFAULT_SHIFT_WINDOWS.day_start)
  const dayEnd = toMinutes(windows?.day_end || DEFAULT_SHIFT_WINDOWS.day_end)
  const nightStart = toMinutes(windows?.night_start || DEFAULT_SHIFT_WINDOWS.night_start)
  const nightEnd = toMinutes(windows?.night_end || DEFAULT_SHIFT_WINDOWS.night_end)
  if (inRange(current, dayStart, dayEnd)) return 'day'
  if (inRange(current, nightStart, nightEnd)) return 'night'
  return 'day'
}

const normalizeMembers = (members, teamName = '') =>
  (Array.isArray(members) ? members : [])
    .map((row, index) => {
      const memberId = String(row?.user_id || row?.id || '').trim()
      const name = String(row?.name || row?.email || '').trim()
      const role = String(row?.role || '').trim()
      const memberKey = normalizeKey(memberId || name || `member-${index + 1}`)
      if (!memberKey || !name) return null
      return { memberKey, memberId, name, role, teamName: String(teamName || '').trim() }
    })
    .filter(Boolean)

const resolveMemberColumns = (count) => {
  const total = Math.max(1, Number(count) || 1)
  if (total === 1) return { xs: 12, md: 12 }
  if (total === 2) return { xs: 6, md: 6 }
  if (total === 3) return { xs: 6, md: 4 }
  if (total === 4) return { xs: 6, md: 3 }
  if (total === 5) return { xs: 6, md: true }
  return { xs: 6, md: 2 }
}

const resolveResponderPriority = (row) => {
  const text = `${String(row?.role || '').trim()} ${String(row?.name || '').trim()}`.toLowerCase()
  if (text.includes('assistant incident commander') || /\baic\b/.test(text)) return 0
  if (text.includes('tactical response team') || /\btrt\b/.test(text)) return 1
  return 2
}

const sortResponders = (rows) =>
  [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const priorityDiff = resolveResponderPriority(a) - resolveResponderPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })

const ErcoRespondingTeamStep = ({
  user,
  form,
  setForm,
  errorMessage,
  clearError,
  pushToast,
  onBack,
  onSaveDraft,
  onContinue,
  showActions = true,
}) => {
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [teamLoadError, setTeamLoadError] = useState('')
  const [useGroupedFallbackView, setUseGroupedFallbackView] = useState(false)
  const actionsRef = React.useRef(null)
  const hasAutoScrolledMemberSelectionRef = React.useRef(false)

  useEffect(() => {
    let cancelled = false

    const hydrateAttendance = async () => {
      const fallbackMember = normalizeMembers(
        [{ id: user?.id, name: user?.name || user?.email || 'Current User', role: 'Shift member' }],
        'Current User',
      )
      const incidentDate = String(form?.incidentDate || form?.reportDate || '').trim()
      const incidentTime = String(form?.incidentTime || form?.reportTime || '').trim()

      setIsLoadingMembers(true)
      setTeamLoadError('')
      setUseGroupedFallbackView(false)

      try {
        const [rosterResp, shiftResp, teamsResp] = await Promise.all([
          incidentDate
            ? fetchRosters({ date: incidentDate, status: 'published' }).catch(() => null)
            : null,
          fetchShiftWindows().catch(() => null),
          fetchTeams(),
        ])
        if (cancelled) return

        const windows = shiftResp?.data || DEFAULT_SHIFT_WINDOWS
        const resolvedShift = resolveShiftByTime(
          incidentTime || DEFAULT_SHIFT_WINDOWS.day_start,
          windows,
        )
        const rosterRows = Array.isArray(rosterResp?.data) ? rosterResp.data : []
        const rosterRow = rosterRows[0]
        const teamOnShiftName = String(
          rosterRow?.shifts?.[resolvedShift]?.team ||
            (resolvedShift === 'day' ? rosterRow?.dayShift?.team : rosterRow?.nightShift?.team) ||
            '',
        ).trim()
        const teams = Array.isArray(teamsResp?.data) ? teamsResp.data : []
        const matchedTeam = teams.find(
          (row) => normalizeKey(row?.name) === normalizeKey(teamOnShiftName),
        )
        const matchedTeamName = String(matchedTeam?.name || teamOnShiftName || '').trim()
        const matchedTeamMembers = sortResponders(
          normalizeMembers(matchedTeam?.members || [], matchedTeamName),
        )

        const groupedTeamMembers = teams
          .map((team) => {
            const teamName = String(team?.name || '').trim() || 'Unnamed Team'
            return {
              teamName,
              members: sortResponders(normalizeMembers(team?.members || [], teamName)),
            }
          })
          .filter((group) => group.members.length > 0)
        const allTeamMembers = groupedTeamMembers.flatMap((group) => group.members)

        let loadError = ''
        let groupedFallback = false
        let respondingTeamName = matchedTeamName || 'Not assigned'
        let baseMembers = matchedTeamMembers

        if (!matchedTeamName || !matchedTeam) {
          groupedFallback = true
          respondingTeamName = 'Not assigned'
          loadError = 'Team not assigned in roster management yet.'
          baseMembers = allTeamMembers
        } else if (matchedTeamMembers.length === 0) {
          groupedFallback = true
          loadError =
            'No members found for team on shift. Showing all team members grouped by team.'
          baseMembers = allTeamMembers
        }

        if (baseMembers.length === 0) {
          baseMembers = fallbackMember
          groupedFallback = false
          if (!loadError) loadError = 'No team members found.'
        }

        setForm((prev) => {
          const prevRows = Array.isArray(prev.respondingAttendance) ? prev.respondingAttendance : []
          const prevMap = new Map(
            prevRows.map((row) => [normalizeKey(row?.memberKey), Boolean(row?.present)]),
          )
          const nextMemberKeySet = new Set(
            baseMembers.map((member) => normalizeKey(member?.memberKey)).filter(Boolean),
          )
          const shouldForcePresetShiftTeam =
            !groupedFallback &&
            baseMembers.length > 0 &&
            (prevRows.length === 0 ||
              String(prev.respondingTeamName || '')
                .trim()
                .toLowerCase() === 'not assigned' ||
              normalizeKey(prev.respondingTeamName) !== normalizeKey(respondingTeamName) ||
              normalizeKey(prev.respondingTeamShift) !== normalizeKey(resolvedShift) ||
              prevRows.some((row) => !nextMemberKeySet.has(normalizeKey(row?.memberKey))))
          const defaultPresent = groupedFallback ? false : true
          const nextRows = baseMembers.map((member) => {
            const hasSavedValue = prevMap.has(member.memberKey)
            return {
              ...member,
              present: shouldForcePresetShiftTeam
                ? true
                : hasSavedValue
                  ? Boolean(prevMap.get(member.memberKey))
                  : defaultPresent,
            }
          })
          return {
            ...prev,
            respondingTeamName: respondingTeamName || prev.respondingTeamName || 'Not assigned',
            respondingTeamShift: resolvedShift || prev.respondingTeamShift || '',
            respondingAttendance: nextRows,
          }
        })
        setTeamLoadError(loadError)
        setUseGroupedFallbackView(groupedFallback)
      } catch {
        if (cancelled) return

        setForm((prev) => {
          const fallbackRows = sortResponders(
            normalizeMembers(
              Array.isArray(prev.respondingAttendance) && prev.respondingAttendance.length
                ? prev.respondingAttendance
                : [{ id: user?.id, name: user?.name || user?.email || 'Current User' }],
              'Current User',
            ),
          )
          const prevRows = Array.isArray(prev.respondingAttendance) ? prev.respondingAttendance : []
          const prevMap = new Map(
            prevRows.map((row) => [normalizeKey(row?.memberKey), Boolean(row?.present)]),
          )
          const nextRows = fallbackRows.map((member) => {
            const hasSavedValue = prevMap.has(member.memberKey)
            return {
              ...member,
              present: hasSavedValue ? Boolean(prevMap.get(member.memberKey)) : true,
            }
          })
          return {
            ...prev,
            respondingTeamName: prev.respondingTeamName || 'Not assigned',
            respondingTeamShift: prev.respondingTeamShift || '',
            respondingAttendance: nextRows,
          }
        })

        setTeamLoadError('Unable to load roster/team data. Showing fallback members.')
        setUseGroupedFallbackView(true)
      } finally {
        if (!cancelled) setIsLoadingMembers(false)
      }
    }

    hydrateAttendance()

    return () => {
      cancelled = true
    }
  }, [
    form?.incidentDate,
    form?.incidentTime,
    form?.reportDate,
    form?.reportTime,
    setForm,
    user?.email,
    user?.id,
    user?.name,
  ])

  const attendanceRows = useMemo(
    () => (Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []),
    [form.respondingAttendance],
  )
  const attendanceGroups = useMemo(() => {
    const map = new Map()
    attendanceRows.forEach((row) => {
      const teamName = String(row?.teamName || '').trim() || 'Unassigned Team'
      if (!map.has(teamName)) map.set(teamName, [])
      map.get(teamName).push(row)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([teamName, rows]) => ({ teamName, rows }))
  }, [attendanceRows])
  const selectedMemberKeys = useMemo(
    () =>
      attendanceRows
        .filter((row) => row?.present)
        .map((row) => normalizeKey(row?.memberKey))
        .filter(Boolean),
    [attendanceRows],
  )
  const memberOptions = useMemo(
    () =>
      attendanceRows.map((row) => ({
        value: row.memberKey,
        title: row.name,
        description: row.role || 'Shift member',
        icon: Users,
      })),
    [attendanceRows],
  )
  const buildMemberOptions = (rows) =>
    rows.map((row) => ({
      value: row.memberKey,
      title: row.name,
      description: row.role || 'Shift member',
      icon: Users,
    }))

  const scrollToActionsOnMobile = () => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 575.98px)').matches) return
    window.requestAnimationFrame(() => {
      actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  const toggleMember = (value) => {
    const key = normalizeKey(value)
    if (!key) return
    const selectedRow = attendanceRows.find((member) => normalizeKey(member?.memberKey) === key)
    const willSelect = !Boolean(selectedRow?.present)
    setForm((prev) => ({
      ...prev,
      respondingAttendance: (Array.isArray(prev.respondingAttendance)
        ? prev.respondingAttendance
        : []
      ).map((member) =>
        normalizeKey(member?.memberKey) === key
          ? { ...member, present: !Boolean(member?.present) }
          : member,
      ),
    }))
    if (clearError) clearError()
    if (willSelect && !hasAutoScrolledMemberSelectionRef.current) {
      hasAutoScrolledMemberSelectionRef.current = true
      scrollToActionsOnMobile()
    }
  }
  const toggleTeamMembers = (rows, present) => {
    const memberKeys = new Set(
      (Array.isArray(rows) ? rows : []).map((row) => normalizeKey(row?.memberKey)).filter(Boolean),
    )
    if (!memberKeys.size) return
    setForm((prev) => ({
      ...prev,
      respondingAttendance: (Array.isArray(prev.respondingAttendance)
        ? prev.respondingAttendance
        : []
      ).map((member) => {
        const key = normalizeKey(member?.memberKey)
        return memberKeys.has(key) ? { ...member, present: Boolean(present) } : member
      }),
    }))
    if (clearError) clearError()
    if (present) scrollToActionsOnMobile()
  }
  const teamLabel = resolveRespondingTeamLabel(form.respondingTeamName, attendanceRows)
  const shiftLabel = String(form.respondingTeamShift || '').trim()
  const incidentDateValue = String(form?.incidentDate || form?.reportDate || '').trim() || '--'
  const incidentTimeValue = String(form?.incidentTime || form?.reportTime || '').trim() || '--'
  const incidentSummaryItems = useMemo(
    () => [
      {
        label: 'Incident Type',
        value: String(form?.incidentType || '').trim() || '--',
      },
      {
        label: 'Weather',
        value: String(form?.weather || '').trim() || '--',
      },
      {
        label: 'Area',
        value: formatErcoLocation(form?.location) || '--',
      },
      {
        label: 'Incident Date',
        value: incidentDateValue,
      },
      {
        label: 'Incident Time',
        value: incidentTimeValue,
      },
    ],
    [form?.incidentType, form?.weather, form?.location, incidentDateValue, incidentTimeValue],
  )

  return (
    <div className="mb-3 d-grid gap-3">
      <div className="d-grid gap-2">
        <div className="d-grid gap-2">
          <div className="fw-semibold">Incident Summary</div>
          <div className="rounded-3 border p-3 p-md-4">
            <CRow className="g-3">
              {incidentSummaryItems.map((item) => (
                <CCol key={item.label} xs={6} md>
                  <div className="small text-body-secondary">{item.label}</div>
                  <div className="fw-semibold">{item.value}</div>
                </CCol>
              ))}
            </CRow>
          </div>
        </div>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
          <div>
            <div className="fw-semibold">On-Scene Responders</div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <CBadge
              color="light"
              className="border text-body-secondary d-inline-flex align-items-center gap-1"
              style={{ maxWidth: '260px' }}
              title={`Team on Shift During Incident: ${teamLabel}`}
            >
              <span className="flex-shrink-0">Team:</span>
              <span className="text-truncate">{teamLabel}</span>
            </CBadge>
            {shiftLabel ? (
              <CBadge color="light" className="border text-body-secondary">
                Shift: {shiftLabel}
              </CBadge>
            ) : null}
          </div>
        </div>
      </div>

      {teamLoadError ? (
        <CAlert color="warning">
          {teamLoadError}
          {useGroupedFallbackView
            ? ' Choose responding members to this incident from the list below.'
            : ''}
        </CAlert>
      ) : null}
      {errorMessage ? <CAlert color="danger">{errorMessage}</CAlert> : null}

      <div className="d-grid gap-2">
        {isLoadingMembers ? (
          <TableLoader message="Loading shift members..." />
        ) : attendanceRows.length === 0 ? (
          <div className="text-body-secondary small">No members found for this shift.</div>
        ) : useGroupedFallbackView ? (
          <div className="d-grid gap-3">
            {attendanceGroups.map((group) => (
              <div key={group.teamName} className="d-grid gap-2">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  {(() => {
                    const allSelected =
                      group.rows.length > 0 && group.rows.every((row) => Boolean(row?.present))
                    const someSelected = group.rows.some((row) => Boolean(row?.present))
                    const checkboxId = `erco-team-select-${normalizeKey(group.teamName).replace(/[^a-z0-9]+/g, '-') || 'team'}`
                    return (
                      <>
                        <CFormCheck
                          id={checkboxId}
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onChange={(event) => toggleTeamMembers(group.rows, event.target.checked)}
                        />
                        <label className="fw-semibold mb-0" htmlFor={checkboxId}>
                          {group.teamName}
                        </label>
                      </>
                    )
                  })()}
                </div>
                <IconOptionGrid
                  options={buildMemberOptions(group.rows)}
                  value={selectedMemberKeys}
                  onChange={toggleMember}
                  variant="compact"
                  showDescription
                  columns={resolveMemberColumns(group.rows.length)}
                  cardProps={(option, isSelected) =>
                    isSelected
                      ? {
                          style: {
                            backgroundColor: ACTIVE_CARD_BG,
                            borderColor: ACTIVE_CARD_BORDER,
                          },
                          icon: null,
                          bodyClassName: 'd-flex align-items-start',
                          paddingClassName: 'p-3',
                        }
                      : {
                          icon: null,
                          bodyClassName: 'd-flex align-items-start',
                          paddingClassName: 'p-3',
                        }
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <IconOptionGrid
            options={memberOptions}
            value={selectedMemberKeys}
            onChange={toggleMember}
            variant="compact"
            showDescription
            columns={resolveMemberColumns(memberOptions.length)}
            cardProps={(option, isSelected) => {
              return isSelected
                ? {
                    style: {
                      backgroundColor: ACTIVE_CARD_BG,
                      borderColor: ACTIVE_CARD_BORDER,
                    },
                    icon: null,
                    bodyClassName: 'd-flex align-items-start',
                    paddingClassName: 'p-3',
                  }
                : {
                    icon: null,
                    bodyClassName: 'd-flex align-items-start',
                    paddingClassName: 'p-3',
                  }
            }}
          />
        )}
      </div>

      {showActions ? (
        <div ref={actionsRef}>
          <DetailsStepActions
            onBack={onBack}
            onSaveDraft={onSaveDraft}
            primaryLabel="Continue"
            primaryType="button"
            onPrimary={() => {
              if (!attendanceRows.length) {
                pushToast('No team members available to mark attendance.', {
                  title: 'No members found',
                  color: 'warning',
                })
                return
              }
              onContinue()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export default ErcoRespondingTeamStep
