import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { Download } from 'lucide-react'
import StatusPill from 'src/views/team/components/StatusPill'
import { resolveImageUrl } from 'src/views/team/components/teamImageUtils'
import TableLoader from 'src/components/TableLoader'
import { exportWorkbook } from 'src/utils/exportXlsx'

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

// ─── Team stat card ───────────────────────────────────────────────────────────

const StatCard = ({ team, stats = {}, status, allShifts = [] }) => {
  const { bg, text: avatarText } = getAvatarColors(team.name)
  const initial = (team.name || '?').trim().charAt(0).toUpperCase()
  const imageUrl = resolveImageUrl(team.image_url)

  const shiftDefs = allShifts.length
    ? allShifts
    : [
        { slug: 'day', name: 'Day' },
        { slug: 'night', name: 'Night' },
      ]

  return (
    <CCol xs={12} md={6} lg={3}>
      <CCard className="h-100" style={{ overflow: 'hidden' }}>
        {imageUrl ? (
          <div
            style={{
              height: 120,
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
              height: 80,
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{ fontSize: '2.25rem', fontWeight: 700, color: avatarText, lineHeight: 1 }}
            >
              {initial}
            </span>
          </div>
        )}

        <CCardBody className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
            <span className="fw-semibold">{team.name}</span>
            <StatusPill label={status || 'Unscheduled'} />
          </div>
          <div className="d-flex flex-column gap-1">
            {shiftDefs.map((s) => (
              <div key={s.slug} className="d-flex justify-content-between align-items-center">
                <span className="text-muted d-flex align-items-center gap-1">
                  {s.builtin === false && (
                    <span
                      title="Custom shift"
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
                  {s.name}
                </span>
                <span className="fw-semibold">{stats?.[s.slug] || 0}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--cui-border-color)', margin: '4px 0' }} />
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">Total</span>
              <span className="fw-semibold">{stats?.total || 0}</span>
            </div>
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

// ─── Monthly breakdown table ──────────────────────────────────────────────────

const DEFAULT_WINDOW = 6

const MonthlyBreakdown = ({ monthlyStats = [], allShifts = [], exportedBy = '' }) => {
  const [showAll, setShowAll] = useState(false)
  const [hidden, setHidden] = useState(new Set())

  if (!monthlyStats.length) return null

  const shiftDefs = allShifts.length
    ? allShifts
    : [
        { slug: 'day', name: 'Day' },
        { slug: 'night', name: 'Night' },
      ]

  const defaultVisible = new Set(monthlyStats.slice(-DEFAULT_WINDOW).map((b) => b.month))
  const isVisible = (month) => {
    if (hidden.has(month)) return false
    if (!showAll && !defaultVisible.has(month)) return false
    return true
  }
  const toggleMonth = (month) =>
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })

  const shownMonths = monthlyStats.filter((b) => isVisible(b.month))
  const scopeMonths = showAll ? monthlyStats : monthlyStats.slice(-DEFAULT_WINDOW)
  const allSelected = scopeMonths.every((b) => !hidden.has(b.month))
  const toggleAll = () => {
    const scopeKeys = new Set(scopeMonths.map((b) => b.month))
    setHidden((prev) => {
      const next = new Set(prev)
      if (allSelected) scopeKeys.forEach((k) => next.add(k))
      else scopeKeys.forEach((k) => next.delete(k))
      return next
    })
  }

  const handleExport = () => {
    const now = new Date()
    const timestamp = now.toLocaleString()
    const datestamp = now.toISOString().slice(0, 10)
    const allMonths = monthlyStats.map((b) => b.month)
    const period =
      allMonths.length > 0 ? `${allMonths[0]} – ${allMonths[allMonths.length - 1]}` : 'All'

    const shiftHeaders = shiftDefs.flatMap((s) => [`${s.name} Shifts`, `Unassigned (${s.name})`])
    const meta = [
      ['Roster Monthly Breakdown'],
      [`Period: ${period}`],
      [`Exported by: ${exportedBy}`],
      [`Exported on: ${timestamp}`],
      [],
    ]

    const dataRows = monthlyStats.flatMap((block) =>
      block.teams.map((team, ti) => [
        ti === 0 ? block.month : '',
        team.name,
        ...shiftDefs.flatMap((s) => [
          team.shifts?.[s.slug] || 0,
          ti === 0 ? (block.unassigned?.[s.slug] ?? '') : '',
        ]),
      ]),
    )

    exportWorkbook({
      filename: `roster-monthly-breakdown-${datestamp}.xlsx`,
      sheets: [
        {
          name: 'Monthly Breakdown',
          headers: [],
          rows: [...meta, ['Month', 'Team', ...shiftHeaders], ...dataRows],
        },
      ],
    })
  }

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="fw-semibold">Monthly Breakdown</div>
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            style={{ fontSize: '0.8rem' }}
            onClick={() => {
              setShowAll((v) => !v)
              setHidden(new Set())
            }}
          >
            {showAll ? 'Show less' : `See all records (${monthlyStats.length} months)`}
          </button>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            className="d-inline-flex align-items-center gap-1"
            onClick={handleExport}
          >
            <Download size={13} />
            Export
          </CButton>
        </div>
      </div>

      {/* Month toggle bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={toggleAll}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleAll()
          }}
          className={`rounded-3 border text-center ${allSelected ? 'border-secondary bg-secondary bg-opacity-10' : 'border-light-subtle'}`}
          style={{ cursor: 'pointer', userSelect: 'none', minWidth: 64, padding: '8px 12px' }}
        >
          <div
            className="fw-semibold"
            style={{ color: allSelected ? 'var(--cui-secondary-color)' : 'inherit' }}
          >
            All
          </div>
          <div className="small" style={{ color: 'var(--cui-secondary-color)' }}>
            {allSelected ? 'Clear' : 'Select'}
          </div>
        </div>
        <div
          style={{
            width: 1,
            background: 'var(--cui-border-color)',
            alignSelf: 'stretch',
            margin: '2px 0',
          }}
        />
        {scopeMonths.map(({ month }) => {
          const vis = !hidden.has(month)
          const [monthName, year] = month.split(' ')
          const shortMonth = monthName.slice(0, 3)
          return (
            <div
              key={month}
              role="button"
              tabIndex={0}
              onClick={() => toggleMonth(month)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggleMonth(month)
              }}
              className={`rounded-3 border text-center ${vis ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                flex: '1 1 0',
                minWidth: 64,
                maxWidth: 100,
                padding: '8px 4px',
              }}
            >
              <div
                className="fw-semibold"
                style={{ color: vis ? 'var(--cui-primary)' : 'inherit' }}
              >
                {shortMonth}
              </div>
              <div
                className="small"
                style={{ color: vis ? 'var(--cui-primary)' : 'var(--cui-secondary-color)' }}
              >
                {year}
              </div>
            </div>
          )
        })}
      </div>

      {shownMonths.length === 0 ? (
        <div className="text-center text-body-secondary py-4">No months selected.</div>
      ) : (
        <div
          className="rounded-3 overflow-hidden"
          style={{ border: '1px solid var(--cui-border-color)' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cui-secondary-bg)' }}>
                <th style={thStyle}>Month</th>
                <th style={thStyle}>Team</th>
                {shiftDefs.map((s) => (
                  <React.Fragment key={s.slug}>
                    <th style={{ ...thStyle, textAlign: 'center' }}>{s.name}</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Unassigned ({s.name})</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownMonths.map((block, bi) => {
                const rowCount = block.teams.length
                return block.teams.map((team, ti) => {
                  const { bg, text } = getAvatarColors(team.name)
                  const isFirst = ti === 0
                  return (
                    <tr
                      key={`${block.month}-${team.name}`}
                      style={{
                        borderTop:
                          isFirst && bi > 0
                            ? '2px solid var(--cui-border-color)'
                            : '1px solid var(--cui-border-color)',
                      }}
                    >
                      {isFirst && (
                        <td
                          rowSpan={rowCount}
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                            verticalAlign: 'middle',
                            borderRight: '1px solid var(--cui-border-color)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {block.month}
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderRight: '1px solid var(--cui-border-color)' }}>
                        <span
                          className="rounded-pill px-2 fw-semibold"
                          style={{ background: bg, color: text }}
                        >
                          {team.name}
                        </span>
                      </td>
                      {shiftDefs.map((s) => (
                        <React.Fragment key={s.slug}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            {team.shifts?.[s.slug] || 0}
                          </td>
                          {isFirst ? (
                            <td
                              rowSpan={rowCount}
                              style={{
                                ...tdStyle,
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                borderLeft: '1px solid var(--cui-border-color)',
                              }}
                            >
                              {block.unassigned?.[s.slug] ?? 0}
                            </td>
                          ) : null}
                        </React.Fragment>
                      ))}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '10px 14px',
  fontWeight: 600,
  borderBottom: '1px solid var(--cui-border-color)',
  whiteSpace: 'nowrap',
  color: 'var(--cui-secondary-color)',
}
const tdStyle = { padding: '10px 14px', textAlign: 'center', verticalAlign: 'middle' }

// ─── Root ─────────────────────────────────────────────────────────────────────

const RosterStat = ({
  stats = {},
  statuses = {},
  teams = [],
  monthlyStats = [],
  allShifts = [],
  loading = false,
  exportedBy = '',
}) => {
  if (loading) return <TableLoader />
  if (!teams.length) return null

  // Group teams: teams with a group label go into named buckets; null/empty → 'Default'
  const hasGroups = teams.some((t) => t.group)
  const groupMap = {}
  teams.forEach((t) => {
    const key = t.group || 'Default'
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(t)
  })
  // Put 'Default' first, then remaining groups in insertion order
  const groupKeys = ['Default', ...Object.keys(groupMap).filter((k) => k !== 'Default')].filter(
    (k) => groupMap[k],
  )

  return (
    <CCard>
      <CCardHeader>Roster Statistics</CCardHeader>
      <CCardBody>
        {hasGroups ? (
          groupKeys.map((groupKey) => (
            <div key={groupKey} className="mb-4">
              <div
                className="text-muted small fw-semibold mb-2"
                style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}
              >
                {groupKey}
              </div>
              <CRow className="g-3">
                {groupMap[groupKey].map((team) => (
                  <StatCard
                    key={team.id}
                    team={team}
                    stats={stats[team.name]}
                    status={statuses[team.name]}
                    allShifts={allShifts}
                  />
                ))}
              </CRow>
            </div>
          ))
        ) : (
          <CRow className="g-3 mb-4">
            {teams.map((team) => (
              <StatCard
                key={team.id}
                team={team}
                stats={stats[team.name]}
                status={statuses[team.name]}
                allShifts={allShifts}
              />
            ))}
          </CRow>
        )}
        <MonthlyBreakdown
          monthlyStats={monthlyStats}
          allShifts={allShifts}
          exportedBy={exportedBy}
        />
      </CCardBody>
    </CCard>
  )
}

export default RosterStat
