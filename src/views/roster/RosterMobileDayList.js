import React, { useState } from 'react'
import { CButton } from '@coreui/react'
import RosterMobileDayEditor from './RosterMobileDayEditor'

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

const getShiftDefs = (allShifts) =>
  allShifts.length
    ? allShifts
    : [
        { slug: 'day', name: 'Day' },
        { slug: 'night', name: 'Night' },
      ]

const TeamBadge = ({ team }) => {
  if (!team) return <span className="text-body-secondary small">Unassigned</span>
  const { bg, text } = getAvatarColors(team)
  return (
    <span
      className="d-inline-flex rounded-pill px-2 fw-semibold"
      style={{
        background: bg,
        color: text,
        fontSize: '0.8125rem',
        lineHeight: '1.6',
        maxWidth: '100%',
        whiteSpace: 'normal',
      }}
    >
      {team}
    </span>
  )
}

const resolveDayStatus = (row) => {
  const shifts = Object.values(row.shifts || {})
  if (shifts.some((shift) => shift?.status === 'draft')) return 'Draft'
  if (shifts.some((shift) => shift?.team || shift?.team_id)) return 'Published'
  return 'Unassigned'
}

const RosterMobileDayList = ({
  monthWeekGroups = [],
  editMode = false,
  teams = [],
  allShifts = [],
  onAssign,
}) => {
  const [editingShift, setEditingShift] = useState(null)
  const shiftDefs = getShiftDefs(allShifts)
  const closeEditor = () => setEditingShift(null)

  return (
    <>
      <div className="d-md-none d-grid gap-3">
        {monthWeekGroups.map((monthBlock) => (
          <section key={monthBlock.month} aria-label={monthBlock.month}>
            <div className="fw-semibold mb-2">{monthBlock.month}</div>
            <div className="d-grid gap-3">
              {monthBlock.weeks
                .flatMap((week) => week.rows)
                .map((row) => {
                  const dayStatus = resolveDayStatus(row)
                  return (
                    <article
                      key={row.date}
                      className="rounded-3 border bg-body shadow-sm overflow-hidden"
                    >
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 px-3 py-2 bg-body-tertiary border-bottom">
                        <div>
                          <div className="fw-semibold">{row.dayName}</div>
                          <div className="small text-body-secondary">{row.date}</div>
                        </div>
                        <span
                          className="rounded-pill px-2 py-1 small fw-semibold"
                          style={{
                            background:
                              dayStatus === 'Draft'
                                ? '#fef3c7'
                                : dayStatus === 'Published'
                                  ? '#d1fae5'
                                  : 'var(--cui-secondary-bg)',
                            color:
                              dayStatus === 'Draft'
                                ? '#92400e'
                                : dayStatus === 'Published'
                                  ? '#065f46'
                                  : 'var(--cui-secondary-color)',
                          }}
                        >
                          {dayStatus}
                        </span>
                      </div>
                      <div className="d-grid">
                        {shiftDefs.map((shiftDef, index) => {
                          const shiftObj = row.shifts?.[shiftDef.slug]
                          return (
                            <div
                              key={shiftDef.slug}
                              className="d-grid gap-2 px-3 py-2"
                              style={{
                                borderTop:
                                  index === 0 ? undefined : '1px solid var(--cui-border-color)',
                              }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                {shiftDef.builtin === false && (
                                  <span
                                    title="Custom shift"
                                    aria-label="Custom shift"
                                    style={{
                                      width: 7,
                                      height: 7,
                                      borderRadius: '50%',
                                      background: '#f59e0b',
                                      display: 'inline-block',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span className="fw-semibold small text-body-secondary">
                                  {shiftDef.name}
                                </span>
                              </div>
                              {editMode ? (
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                  <TeamBadge team={shiftObj?.team} />
                                  <CButton
                                    size="sm"
                                    color="primary"
                                    variant="outline"
                                    onClick={() => setEditingShift({ row, shiftDef, shiftObj })}
                                  >
                                    Change
                                  </CButton>
                                </div>
                              ) : (
                                <TeamBadge team={shiftObj?.team} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
      {editingShift ? (
        <RosterMobileDayEditor
          key={`${editingShift.row?.date || 'date'}-${editingShift.shiftDef?.slug || 'shift'}-${
            editingShift.shiftObj?.team_id || 'none'
          }`}
          visible
          row={editingShift.row}
          shiftDef={editingShift.shiftDef}
          currentTeamId={editingShift.shiftObj?.team_id}
          teams={teams}
          onAssign={onAssign}
          onClose={closeEditor}
        />
      ) : null}
    </>
  )
}

export default RosterMobileDayList
