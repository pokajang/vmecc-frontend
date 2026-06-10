import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import { BookCheck, Download, FileEdit, Pencil, Printer } from 'lucide-react'
import TableLoader from 'src/components/TableLoader'
import ButtonLoader from 'src/components/ButtonLoader'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { exportWorkbook } from 'src/utils/exportXlsx'
import RosterStat from './RosterStat'
import RosterFilter from './RosterFilter'
import RosterCard from './RosterCard'
import useRosterState from './useRosterState'
import { hasPermission } from 'src/utils/authz'
// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_KEYS = ['overview', 'schedule']
const DEFAULT_TAB = 'overview'

const TAB_BY_PATH = {
  overview: 'overview',
  schedule: 'schedule',
}

const PATH_BY_TAB = {
  overview: 'overview',
  schedule: 'schedule',
}

const ghostBtn = 'text-primary px-2 py-1 border-0 bg-transparent shadow-none'

// ─── Publish status badge ─────────────────────────────────────────────────────

const PublishBadge = ({ status }) => {
  if (!status) return null
  if (status === 'published') {
    return (
      <span
        className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold"
        style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem' }}
      >
        <BookCheck size={11} />
        Published
      </span>
    )
  }
  return (
    <span
      className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold"
      style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}
    >
      <FileEdit size={11} />
      Draft
    </span>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

const OverviewTab = ({ canManageRoster, exportedBy }) => {
  const {
    state: { stats, monthlyStats, teams, allShifts, teamStatuses, loading },
  } = useRosterState(canManageRoster, true, 'all') // publishedOnly=true, fetch all historical data

  return (
    <RosterStat
      stats={stats}
      statuses={teamStatuses}
      teams={teams}
      monthlyStats={monthlyStats}
      allShifts={allShifts}
      loading={loading}
      exportedBy={exportedBy}
    />
  )
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

const ScheduleTab = ({ canManageRoster, exportedBy }) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const {
    state: {
      rangeType,
      dateFilter,
      startDate,
      endDate,
      teamFilter,
      search,
      selectedMonths,
      editMode,
      isSavingDraft,
      isPublishing,
      isDirty,
      statusMessage,
      error,
      loading,
      monthOptions,
      monthWeekGroups,
      filteredRows,
      teams,
      allShifts,
      scopeLabel,
      viewPublishStatus,
    },
    actions: {
      setDateFilter,
      setStartDate,
      setEndDate,
      setTeamFilter,
      setSearch,
      setEditMode,
      handleRangeChange,
      handleClear,
      handleAssign,
      handleSaveDraft,
      handlePublish,
      handleCancelEdit,
      handlePrev,
      handleNext,
      onMonthToggle,
    },
  } = useRosterState(canManageRoster)

  const handleCancelClick = () => {
    if (isDirty) setShowCancelConfirm(true)
    else handleCancelEdit()
  }

  const escHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const handlePrint = () => {
    const now = new Date().toLocaleString()
    const shiftDefs = allShifts.length
      ? allShifts
      : [{ slug: 'day', name: 'Day' }, { slug: 'night', name: 'Night' }]

    const monthBlocks = monthWeekGroups.map((mb) => {
      const allRows = mb.weeks.flatMap((w) => w.rows)
      const hasDraft = allRows.some((r) =>
        Object.values(r.shifts || {}).some((s) => s?.status === 'draft')
      )

      const headerCols = allRows.map((row) => {
        const t = new Date()
        const todayStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
        const todayCls = row.date === todayStr ? ' today' : ''
        const d = new Date(row.date)
        const wknd = (d.getDay()===0||d.getDay()===6) ? ' weekend' : ''
        return `<th class="date-col${todayCls}${wknd}">
          <div class="dow">${escHtml(row.dayName.slice(0,3).toUpperCase())}</div>
          <div class="dnum">${escHtml(row.date.slice(8))}</div>
        </th>`
      }).join('')

      const shiftRows = shiftDefs.map((shiftDef) => {
        const cells = allRows.map((row) => {
          const shiftObj = row.shifts?.[shiftDef.slug]
          const isDraft = shiftObj?.status === 'draft'
          const t = new Date()
          const todayStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
          const todayCls = row.date === todayStr ? ' today' : ''
          const d = new Date(row.date)
          const wknd = (d.getDay()===0||d.getDay()===6) ? ' weekend' : ''
          const draftCls = isDraft ? ' draft-cell' : ''
          const team = escHtml(shiftObj?.team || '')
          return `<td class="data-col${todayCls}${wknd}${draftCls}">${team}${isDraft && team ? '<span class="draft-dot">●</span>' : ''}</td>`
        }).join('')
        return `<tr><td class="label-col">${escHtml(shiftDef.name)}</td>${cells}</tr>`
      }).join('')

      return `
        <div class="month-block">
          <div class="month-label">
            ${escHtml(mb.month)}
            ${hasDraft ? '<span class="draft-badge">DRAFT</span>' : '<span class="pub-badge">PUBLISHED</span>'}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="label-col">Shift</th>${headerCols}</tr></thead>
              <tbody>${shiftRows}</tbody>
            </table>
          </div>
        </div>`
    }).join('')

    const w = window.open('', '_blank', 'width=1400,height=900')
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Roster Schedule — ${scopeLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 9px; color: #111; padding: 16px; }
    .doc-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
    .doc-meta { color: #555; font-size: 8px; margin-bottom: 6px; }
    .legend { display: flex; gap: 14px; font-size: 8px; color: #444; margin-bottom: 14px; padding: 5px 8px; background: #f8f8f8; border-radius: 4px; border: 1px solid #e5e7eb; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-pub { width: 10px; height: 10px; background: #fff; border: 1px solid #ccc; border-radius: 2px; }
    .legend-draft { width: 10px; height: 10px; background: #fef9c3; border: 1px solid #fde047; border-radius: 2px; }
    .month-block { margin-bottom: 16px; }
    .month-label { font-weight: 700; font-size: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .draft-badge { font-size: 7px; font-weight: 700; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; border-radius: 3px; padding: 1px 5px; letter-spacing: 0.05em; }
    .pub-badge { font-size: 7px; font-weight: 700; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; border-radius: 3px; padding: 1px 5px; }
    .table-wrap { overflow: visible; width: 100%; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d1d5db; text-align: center; padding: 2px 1px; overflow: hidden; }
    .label-col { width: 36px; font-weight: 600; text-align: left; padding: 2px 4px; background: #f3f4f6; font-size: 8px; }
    .date-col { font-size: 8px; }
    .dow { font-size: 6px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .dnum { font-weight: 600; font-size: 9px; }
    .data-col { font-size: 8px; font-weight: 500; height: 22px; }
    .today { background: #eff6ff !important; }
    .today .dow, .today .dnum { color: #1d4ed8; }
    .weekend { background: #f9fafb; color: #9ca3af; }
    .draft-cell { background: #fef9c3 !important; }
    .draft-dot { color: #ca8a04; font-size: 6px; margin-left: 1px; vertical-align: super; }
    @page { size: A3 landscape; margin: 10mm; }
    @media print { body { padding: 0; } .month-block { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="doc-title">Roster Schedule</div>
  <div class="doc-meta">
    Period: ${escHtml(scopeLabel)} &nbsp;·&nbsp;
    Printed by: ${escHtml(exportedBy)} &nbsp;·&nbsp;
    ${escHtml(now)}
  </div>
  <div class="legend">
    <div class="legend-item"><div class="legend-pub"></div> Published shift</div>
    <div class="legend-item"><div class="legend-draft"></div> Draft shift (amber = not yet published)</div>
    <div class="legend-item">● = draft indicator on cell</div>
  </div>
  ${monthBlocks}
</body>
</html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const handleExportXlsx = () => {
    const now = new Date()
    const timestamp = now.toLocaleString()
    const datestamp = now.toISOString().slice(0, 10)
    const meta = [
      ['Roster Schedule'],
      [`Period: ${scopeLabel}`],
      [`Exported by: ${exportedBy}`],
      [`Exported on: ${timestamp}`],
      [],
    ]

    const shiftDefs = allShifts.length
      ? allShifts
      : [{ slug: 'day', name: 'Day' }, { slug: 'night', name: 'Night' }]

    // Sheet 1: full schedule — one row per date
    const shiftScheduleHeaders = shiftDefs.flatMap((s) => [`${s.name} Team`, `${s.name} Status`])
    const scheduleRows = [
      ...meta,
      ['Date', 'Day of Week', ...shiftScheduleHeaders],
      ...filteredRows.map((row) => [
        row.date,
        row.dayName,
        ...shiftDefs.flatMap((s) => {
          const shiftObj = row.shifts?.[s.slug]
          return [
            shiftObj?.team || '—',
            shiftObj ? (row.status === 'published' ? 'Published' : 'Draft') : '—',
          ]
        }),
      ]),
    ]

    // Sheet 2: monthly summary
    const shiftSummaryHeaders = shiftDefs.flatMap((s) => [`${s.name} Shifts`, `Unassigned (${s.name})`])
    const summaryRows = [
      ...meta,
      ['Month', 'Team', ...shiftSummaryHeaders],
    ]
    // aggregate per month per team from filteredRows
    const monthMap = {}
    filteredRows.forEach((row) => {
      const d = new Date(row.date)
      const mKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      if (!monthMap[mKey]) {
        monthMap[mKey] = { days: 0, teamShifts: {} }
        shiftDefs.forEach((s) => { monthMap[mKey].teamShifts[s.slug] = {} })
      }
      monthMap[mKey].days += 1
      shiftDefs.forEach((s) => {
        const teamName = row.shifts?.[s.slug]?.team
        if (teamName) {
          monthMap[mKey].teamShifts[s.slug][teamName] = (monthMap[mKey].teamShifts[s.slug][teamName] || 0) + 1
        }
      })
    })
    const allTeamNames = [...new Set(teams.map((t) => t.name))]
    Object.entries(monthMap).forEach(([month, data]) => {
      const assignedPerShift = shiftDefs.map((s) =>
        Object.values(data.teamShifts[s.slug]).reduce((sum, n) => sum + n, 0)
      )
      allTeamNames.forEach((name, ti) => {
        summaryRows.push([
          ti === 0 ? month : '',
          name,
          ...shiftDefs.flatMap((s, si) => [
            data.teamShifts[s.slug][name] || 0,
            ti === 0 ? data.days - assignedPerShift[si] : '',
          ]),
        ])
      })
    })

    exportWorkbook({
      filename: `roster-schedule-${datestamp}.xlsx`,
      sheets: [
        { name: 'Schedule', headers: [], rows: scheduleRows },
        { name: 'Monthly Summary', headers: [], rows: summaryRows },
      ],
    })
  }

  const handlePublishConfirm = async () => {
    setShowPublishConfirm(false)
    await handlePublish()
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span>Set Roster</span>
            {!editMode && viewPublishStatus && <PublishBadge status={viewPublishStatus} />}
            {editMode && scopeLabel && (
              <span className="text-muted small fw-normal">— editing {scopeLabel}</span>
            )}
          </div>

          {!editMode ? (
            <div className="d-flex align-items-center gap-2">
              <CButton
                size="sm"
                className={`d-inline-flex align-items-center ${ghostBtn}`}
                onClick={handlePrint}
                disabled={loading || monthWeekGroups.length === 0}
                title="Print / Save as PDF"
              >
                <Printer size={13} className="me-1 align-text-bottom" />
                Print / PDF
              </CButton>
              <CButton
                size="sm"
                className={`d-inline-flex align-items-center ${ghostBtn}`}
                onClick={handleExportXlsx}
                disabled={loading || filteredRows.length === 0}
                title="Export to Excel"
              >
                <Download size={13} className="me-1 align-text-bottom" />
                Export
              </CButton>
              <CButton
                size="sm"
                className={`d-inline-flex align-items-center ${ghostBtn}`}
                onClick={() => setEditMode(true)}
              >
                <Pencil size={13} className="me-1 align-text-bottom" />
                Edit
              </CButton>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <CButton size="sm" className={ghostBtn} disabled={isSavingDraft || isPublishing} onClick={handleSaveDraft} title="Save privately — teams will not be notified">
                {isSavingDraft ? <ButtonLoader label="Saving..." /> : 'Save Draft'}
              </CButton>
              <CButton size="sm" className={ghostBtn} disabled={isSavingDraft || isPublishing} onClick={() => setShowPublishConfirm(true)} title="Publish and notify all assigned teams">
                {isPublishing ? <ButtonLoader label="Publishing..." /> : 'Publish'}
              </CButton>
              <CButton size="sm" className={ghostBtn} disabled={isSavingDraft || isPublishing} onClick={handleCancelClick}>
                Cancel
              </CButton>
            </div>
          )}
        </CCardHeader>

        <CCardBody className="p-4">
          {statusMessage && <CAlert color="success" className="mb-4">{statusMessage}</CAlert>}
          {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}

          <RosterFilter
            rangeType={rangeType}
            onRangeChange={handleRangeChange}
            dateFilter={dateFilter}
            onDateChange={setDateFilter}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            teamFilter={teamFilter}
            onTeamChange={setTeamFilter}
            search={search}
            onSearchChange={setSearch}
            monthOptions={monthOptions}
            selectedMonths={selectedMonths}
            onMonthToggle={onMonthToggle}
            onClear={handleClear}
            onPrev={handlePrev}
            onNext={handleNext}
            teams={teams}
          />

          {loading ? (
            <TableLoader />
          ) : !loading && teams.length === 0 ? (
            <div className="text-center text-muted py-4">
              No teams configured yet.{' '}
              <Link to="/team/details" className="text-primary">Go to Team Details</Link> to set up teams first.
            </div>
          ) : monthWeekGroups.length === 0 ? (
            <div className="text-center text-muted py-4">No roster found for this period.</div>
          ) : (
            <div id="roster-print-area">
              {allShifts.some((s) => s.builtin === false) && (
                <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  Custom shift
                </div>
              )}
              {monthWeekGroups.map((monthBlock) => (
                <RosterCard
                  key={monthBlock.month}
                  monthBlock={monthBlock}
                  editMode={editMode}
                  teams={teams}
                  allShifts={allShifts}
                  onAssign={handleAssign}
                />
              ))}
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Discard confirmation */}
      <CModal visible={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} alignment="center">
        <CModalHeader><CModalTitle>Discard changes?</CModalTitle></CModalHeader>
        <CModalBody className="text-body-secondary">
          You have unsaved roster changes for <strong>{scopeLabel}</strong>. Cancelling will discard them.
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={() => setShowCancelConfirm(false)}>Keep editing</CButton>
          <CButton color="danger" onClick={() => { setShowCancelConfirm(false); handleCancelEdit() }}>Discard changes</CButton>
        </CModalFooter>
      </CModal>

      {/* Publish confirmation */}
      <CModal visible={showPublishConfirm} onClose={() => setShowPublishConfirm(false)} alignment="center">
        <CModalHeader><CModalTitle>Publish Roster?</CModalTitle></CModalHeader>
        <CModalBody>
          <p className="mb-3">You are about to publish the roster for <strong>{scopeLabel}</strong>.</p>
          <p className="text-body-secondary mb-0">
            All members of the assigned teams will receive an email notification with their shift schedule.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={() => setShowPublishConfirm(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handlePublishConfirm}>Confirm & Publish</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const RosterManagement = () => {
  const authUser = useSelector((state) => state.authUser)
  const canManageRoster = hasPermission(authUser, 'rosters.manage')
  const exportedBy = authUser?.name || authUser?.email || 'Unknown'
  const location = useLocation()
  const navigate = useNavigate()

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || ''
  const resolvedTab = TAB_BY_PATH[pathSegment] || DEFAULT_TAB

  const switchTab = (tab) => {
    if (!TAB_KEYS.includes(tab)) return
    navigate(`/roster/${PATH_BY_TAB[tab]}`, { replace: true })
  }

  if (!canManageRoster) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage rosters.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CNav variant="underline" role="tablist" className="mb-3">
        <CNavItem role="presentation">
          <CNavLink
            active={resolvedTab === 'overview'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.preventDefault(); switchTab('overview') }}
          >
            Overview
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={resolvedTab === 'schedule'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.preventDefault(); switchTab('schedule') }}
          >
            Set Roster
          </CNavLink>
        </CNavItem>
      </CNav>

      {resolvedTab === 'overview' && <OverviewTab canManageRoster={canManageRoster} exportedBy={exportedBy} />}
      {resolvedTab === 'schedule' && <ScheduleTab canManageRoster={canManageRoster} exportedBy={exportedBy} />}
    </CContainer>
  )
}

export default RosterManagement
