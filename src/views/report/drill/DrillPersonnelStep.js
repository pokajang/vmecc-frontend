import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CAlert, CButton, CFormCheck, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import TableLoader from 'src/components/TableLoader'
import { fetchRosters, fetchShiftWindows, fetchTeams } from 'src/services/apiClient'
import { uid } from '../utils'
import { DRILL_EXERCISE_ROLE_OPTIONS, DRILL_FIELD_LIMITS } from './constants'
import DrillStageActions from './DrillStageActions'
import { validateDrillPersonnel } from './validation'

const DEFAULT_WINDOWS = { day_start: '07:00', day_end: '19:00' }
const key = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
const toMinutes = (value) => {
  const [hours, minutes] = String(value || '00:00')
    .split(':')
    .map(Number)
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)
}
const resolveShift = (time, windows) => {
  const current = toMinutes(time)
  const start = toMinutes(windows?.day_start || DEFAULT_WINDOWS.day_start)
  const end = toMinutes(windows?.day_end || DEFAULT_WINDOWS.day_end)
  return current >= start && current < end ? 'day' : 'night'
}

const normalizeMembers = (teams) =>
  (Array.isArray(teams) ? teams : []).flatMap((team) => {
    const teamName = String(team?.name || '').trim()
    return (Array.isArray(team?.members) ? team.members : [])
      .map((member, index) => {
        const memberId = String(member?.user_id || member?.id || '').trim()
        const name = String(member?.name || member?.email || '').trim()
        if (!name) return null
        return {
          memberKey: key(memberId || `${teamName}-${name}-${index}`),
          memberId,
          name,
          role: String(member?.role || '').trim(),
          exerciseRole: '',
          teamName,
          present: false,
          source: 'roster',
        }
      })
      .filter(Boolean)
  })

const DrillPersonnelStep = ({
  user,
  form,
  setForm,
  fieldErrors,
  setFieldErrors = () => {},
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
  blockerMessage,
  isSaving,
}) => {
  const [loading, setLoading] = useState(false)
  const [loadMessage, setLoadMessage] = useState('')
  const [manual, setManual] = useState({ name: '', role: '', exerciseRole: 'Participant' })
  const userEditedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadMessage('')
      try {
        const [teamsResponse, rosterResponse, windowsResponse] = await Promise.all([
          fetchTeams(),
          form.reportDate
            ? fetchRosters({ date: form.reportDate, status: 'published' }).catch(() => null)
            : null,
          fetchShiftWindows().catch(() => null),
        ])
        if (cancelled) return
        const teams = Array.isArray(teamsResponse?.data) ? teamsResponse.data : []
        const allMembers = normalizeMembers(teams)
        const members = allMembers.slice(0, DRILL_FIELD_LIMITS.personnel)
        const shift = resolveShift(form.reportTime, windowsResponse?.data)
        const roster = Array.isArray(rosterResponse?.data) ? rosterResponse.data[0] : null
        const suggestedTeam = String(
          roster?.shifts?.[shift]?.team ||
            (shift === 'day' ? roster?.dayShift?.team : roster?.nightShift?.team) ||
            '',
        ).trim()

        setForm((prev) => {
          const existing = Array.isArray(prev.respondingAttendance) ? prev.respondingAttendance : []
          if (userEditedRef.current) return prev
          const existingByKey = new Map(existing.map((row) => [key(row.memberKey), row]))
          const membersByKey = new Map(members.map((member) => [key(member.memberKey), member]))
          const preservedRows = existing.map((saved) => ({
            ...(membersByKey.get(key(saved.memberKey)) || {}),
            ...saved,
          }))
          const nextRows = [
            ...preservedRows,
            ...members
              .filter((member) => !existingByKey.has(key(member.memberKey)))
              .map((member) => ({
                ...member,
                present:
                  existing.length === 0 && suggestedTeam
                    ? key(member.teamName) === key(suggestedTeam)
                    : false,
              })),
          ].slice(0, DRILL_FIELD_LIMITS.personnel)
          if (!nextRows.length && existing.length) return prev
          return {
            ...prev,
            respondingTeamName: prev.respondingTeamName || suggestedTeam || 'Not assigned',
            respondingTeamShift: prev.respondingTeamShift || shift,
            respondingAttendance: nextRows,
          }
        })
        if (allMembers.length > DRILL_FIELD_LIMITS.personnel) {
          setLoadMessage(
            `The roster contains more than ${DRILL_FIELD_LIMITS.personnel} people. Existing selections were preserved and the list was limited to ${DRILL_FIELD_LIMITS.personnel}.`,
          )
        } else if (!members.length)
          setLoadMessage('No roster members were found. Add participants manually.')
        else if (!suggestedTeam) {
          setLoadMessage('No team was assigned for this date and shift. Select members manually.')
        }
      } catch {
        if (!cancelled) {
          setLoadMessage('Roster data could not be loaded. Existing selections are preserved.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [form.reportDate, form.reportTime, setForm])

  const rows = useMemo(
    () => (Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []),
    [form.respondingAttendance],
  )
  const groups = useMemo(() => {
    const result = new Map()
    rows.forEach((row) => {
      const team = String(row.teamName || '').trim() || 'Manual / Unassigned'
      if (!result.has(team)) result.set(team, [])
      result.get(team).push(row)
    })
    return [...result.entries()]
  }, [rows])

  const updateRow = (memberKey, patch) => {
    userEditedRef.current = true
    const nextRows = rows.map((row) => (row.memberKey === memberKey ? { ...row, ...patch } : row))
    setForm((prev) => ({ ...prev, respondingAttendance: nextRows }))
    const result = validateDrillPersonnel({ ...form, respondingAttendance: nextRows })
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (result.errors.respondingAttendance) {
        next.respondingAttendance = result.errors.respondingAttendance
      } else {
        delete next.respondingAttendance
      }
      return next
    })
  }

  const addManual = () => {
    const name = manual.name.trim()
    if (!name) return
    if (rows.length >= DRILL_FIELD_LIMITS.personnel) {
      setLoadMessage(`A Drill report can contain up to ${DRILL_FIELD_LIMITS.personnel} people.`)
      return
    }
    const duplicate = rows.some((row) => key(row.name) === key(name))
    if (duplicate) {
      setLoadMessage(`A participant named ${name} is already listed.`)
      return
    }
    userEditedRef.current = true
    const memberKey = `manual-${uid()}`
    setForm((prev) => ({
      ...prev,
      respondingAttendance: [
        ...prev.respondingAttendance,
        {
          memberKey,
          memberId: '',
          name,
          role: manual.role.trim(),
          exerciseRole: manual.exerciseRole,
          teamName: 'Manual / External',
          present: true,
          source: 'manual',
        },
      ],
    }))
    setManual({ name: '', role: '', exerciseRole: 'Participant' })
    setLoadMessage('')
  }

  return (
    <div className="d-grid gap-4">
      <div className="small text-body-secondary">
        Optional — select participants and exercise roles.
      </div>
      {loading ? <TableLoader message="Loading roster members..." /> : null}
      {loadMessage ? <CAlert color="warning">{loadMessage}</CAlert> : null}
      {fieldErrors?.respondingAttendance ? (
        <CAlert color="danger">{fieldErrors.respondingAttendance}</CAlert>
      ) : null}

      <section className="d-grid gap-3" data-drill-field="respondingAttendance">
        {!loading
          ? groups.map(([teamName, members]) => (
              <section key={teamName} className="rounded-3 border p-3 d-grid gap-3">
                <div className="fw-semibold">{teamName}</div>
                {members.map((member) => (
                  <div
                    key={member.memberKey}
                    className="d-grid d-md-flex align-items-md-center gap-2 border-top pt-3"
                  >
                    <CFormCheck
                      id={`drill-member-${member.memberKey}`}
                      checked={member.present !== false}
                      label={member.name}
                      onChange={(event) =>
                        updateRow(member.memberKey, { present: event.target.checked })
                      }
                    />
                    <div className="small text-body-secondary flex-grow-1">
                      {member.role || 'Member'}
                    </div>
                    <CFormSelect
                      aria-label={`Exercise role for ${member.name}`}
                      value={member.exerciseRole || ''}
                      onChange={(event) =>
                        updateRow(member.memberKey, { exerciseRole: event.target.value })
                      }
                    >
                      <option value="">No exercise role</option>
                      {DRILL_EXERCISE_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </CFormSelect>
                    {member.source === 'manual' ? (
                      <CButton
                        type="button"
                        color="light"
                        aria-label={`Remove ${member.name}`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            respondingAttendance: prev.respondingAttendance.filter(
                              (row) => row.memberKey !== member.memberKey,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </CButton>
                    ) : null}
                  </div>
                ))}
              </section>
            ))
          : null}

        <section
          className="rounded-3 border p-3 d-grid gap-3"
          aria-labelledby="manual-person-title"
        >
          <div id="manual-person-title" className="fw-semibold">
            Add manual / external participant
          </div>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <CFormLabel htmlFor="drill-manual-name">Name</CFormLabel>
              <CFormInput
                id="drill-manual-name"
                maxLength={DRILL_FIELD_LIMITS.shortText}
                value={manual.name}
                onChange={(event) => setManual((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-3">
              <CFormLabel htmlFor="drill-manual-org-role">Organisation role</CFormLabel>
              <CFormInput
                id="drill-manual-org-role"
                maxLength={DRILL_FIELD_LIMITS.shortText}
                value={manual.role}
                onChange={(event) => setManual((prev) => ({ ...prev, role: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-3">
              <CFormLabel htmlFor="drill-manual-exercise-role">Exercise role</CFormLabel>
              <CFormSelect
                id="drill-manual-exercise-role"
                value={manual.exerciseRole}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, exerciseRole: event.target.value }))
                }
              >
                {DRILL_EXERCISE_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </CFormSelect>
            </div>
            <div className="col-12 col-md-2 d-grid align-self-end">
              <CButton
                type="button"
                color="light"
                disabled={!manual.name.trim() || rows.length >= DRILL_FIELD_LIMITS.personnel}
                onClick={addManual}
              >
                <Plus size={14} className="me-1" /> Add
              </CButton>
            </div>
          </div>
        </section>
      </section>

      <DrillStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={draftStatus}
        blockerMessage={blockerMessage}
        isSaving={isSaving}
      />
    </div>
  )
}

export default DrillPersonnelStep
