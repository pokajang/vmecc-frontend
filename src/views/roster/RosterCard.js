import React from 'react'

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

const TeamBadge = ({ team }) => {
  if (!team) return null
  const { bg, text } = getAvatarColors(team)
  return (
    <span
      className="d-inline-block rounded-pill px-2 fw-semibold"
      style={{ background: bg, color: text, fontSize: '0.875rem', lineHeight: '1.6', whiteSpace: 'nowrap' }}
    >
      {team}
    </span>
  )
}

const ShiftSelect = ({ value, teams, onChange }) => {
  const strVal = value !== undefined && value !== null ? String(value) : ''
  const isOrphaned = strVal && !teams.some((t) => String(t.id) === strVal)
  return (
    <select
      className="form-select form-select-sm"
      style={{
        fontSize: '0.875rem',
        width: '100%',
        minWidth: 0,
        border: isOrphaned ? '1px solid var(--cui-danger)' : '1px solid var(--cui-border-color)',
        borderRadius: 6,
        padding: '2px 24px 2px 8px',
        background: 'var(--cui-body-bg)',
        cursor: 'pointer',
      }}
      value={strVal}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">—</option>
      {isOrphaned && <option value={strVal} disabled>(deleted team)</option>}
      {teams.map((t) => (
        <option key={t.id} value={String(t.id)}>{t.name}</option>
      ))}
    </select>
  )
}

const isToday = (dateStr) => {
  const today = new Date()
  return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const isWeekend = (dateStr) => {
  const d = new Date(dateStr)
  return d.getDay() === 0 || d.getDay() === 6
}

// ─── Main component ───────────────────────────────────────────────────────────

const RosterCard = ({ monthBlock, editMode = false, teams = [], allShifts = [], onAssign }) => {
  const weekStarts = new Set(monthBlock.weeks.map((w) => w.rows[0]?.date).filter(Boolean))
  const allRows = monthBlock.weeks.flatMap((w) => w.rows)

  // Use allShifts for row order; fall back to built-ins if empty
  const shiftDefs = allShifts.length
    ? allShifts
    : [{ slug: 'day', name: 'Day' }, { slug: 'night', name: 'Night' }]

  const cellBase = {
    borderRight: '1px solid var(--cui-border-color)',
    verticalAlign: 'middle',
    padding: editMode ? '4px 6px' : '6px 8px',
    minWidth: editMode ? 110 : 90,
  }

  const weekBorder = (dateStr) =>
    weekStarts.has(dateStr) ? { borderLeft: '2px solid var(--cui-border-color)' } : {}

  const headerCellStyle = (dateStr) => ({
    ...cellBase,
    ...weekBorder(dateStr),
    background: isToday(dateStr)
      ? '#eff6ff'
      : isWeekend(dateStr)
        ? 'var(--cui-tertiary-bg)'
        : 'var(--cui-secondary-bg)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  })

  const dataCellStyle = (dateStr) => ({
    ...cellBase,
    ...weekBorder(dateStr),
    background: isToday(dateStr)
      ? '#f0f9ff'
      : isWeekend(dateStr)
        ? 'rgba(0,0,0,0.015)'
        : 'transparent',
    textAlign: 'center',
    height: 52,
  })

  const labelCellStyle = {
    padding: '8px 14px',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
    color: 'var(--cui-secondary-color)',
    background: 'var(--cui-secondary-bg)',
    borderRight: '1px solid var(--cui-border-color)',
    verticalAlign: 'middle',
    position: 'sticky',
    left: 0,
    zIndex: 1,
    minWidth: 72,
  }

  return (
    <div className="mb-4">
      <div className="fw-semibold mb-2 month-label">{monthBlock.month}</div>

      <div
        className="rounded-3"
        style={{
          border: '1px solid var(--cui-border-color)',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db transparent',
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
          {/* ── Date header row ── */}
          <thead>
            <tr>
              <th style={{ ...labelCellStyle, borderBottom: '1px solid var(--cui-border-color)' }}>
                Shift
              </th>
              {allRows.map((row) => (
                <th
                  key={row.date}
                  style={{ ...headerCellStyle(row.date), borderBottom: '1px solid var(--cui-border-color)' }}
                >
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: isToday(row.date) ? '#2563eb' : 'var(--cui-secondary-color)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {row.dayName.slice(0, 3)}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: isToday(row.date) ? 700 : 500,
                    color: isToday(row.date) ? '#1d4ed8' : 'inherit',
                    lineHeight: 1.2,
                  }}>
                    {row.date.slice(8)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shiftDefs.map((shiftDef, si) => {
              const isLast = si === shiftDefs.length - 1
              return (
                <tr key={shiftDef.slug}>
                  <td style={{ ...labelCellStyle, ...(isLast ? {} : { borderBottom: '1px solid var(--cui-border-color)' }) }}>
                    <div className="d-flex align-items-center gap-1">
                      {shiftDef.builtin === false && (
                        <span title="Custom shift" style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                      )}
                      {shiftDef.name}
                    </div>
                  </td>
                  {allRows.map((row) => {
                    const shiftObj = row.shifts?.[shiftDef.slug]
                    return (
                      <td
                        key={row.date}
                        style={{
                          ...dataCellStyle(row.date),
                          ...(isLast ? {} : { borderBottom: '1px solid var(--cui-border-color)' }),
                        }}
                      >
                        {editMode ? (
                          <ShiftSelect
                            value={shiftObj?.team_id}
                            teams={teams}
                            onChange={(teamId) => onAssign(row.date, shiftDef.slug, teamId)}
                          />
                        ) : (
                          <TeamBadge team={shiftObj?.team} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RosterCard
