import { exportWorkbook } from 'src/utils/exportXlsx'

export const getRosterShiftDefs = (allShifts = []) =>
  allShifts.length
    ? allShifts
    : [
        { slug: 'day', name: 'Day' },
        { slug: 'night', name: 'Night' },
      ]

export const escapeRosterHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const printRosterSchedule = ({
  monthWeekGroups = [],
  allShifts = [],
  scopeLabel = '',
  exportedBy = 'Unknown',
  openWindow = window.open,
} = {}) => {
  const now = new Date().toLocaleString()
  const shiftDefs = getRosterShiftDefs(allShifts)

  const monthBlocks = monthWeekGroups
    .map((monthBlock) => {
      const allRows = monthBlock.weeks.flatMap((week) => week.rows)
      const hasDraft = allRows.some((row) =>
        Object.values(row.shifts || {}).some((shift) => shift?.status === 'draft'),
      )

      const headerCols = allRows
        .map((row) => {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const todayClass = row.date === todayStr ? ' today' : ''
          const date = new Date(row.date)
          const weekendClass = date.getDay() === 0 || date.getDay() === 6 ? ' weekend' : ''
          return `<th class="date-col${todayClass}${weekendClass}">
          <div class="dow">${escapeRosterHtml(row.dayName.slice(0, 3).toUpperCase())}</div>
          <div class="dnum">${escapeRosterHtml(row.date.slice(8))}</div>
        </th>`
        })
        .join('')

      const shiftRows = shiftDefs
        .map((shiftDef) => {
          const cells = allRows
            .map((row) => {
              const shiftObj = row.shifts?.[shiftDef.slug]
              const isDraft = shiftObj?.status === 'draft'
              const today = new Date()
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              const todayClass = row.date === todayStr ? ' today' : ''
              const date = new Date(row.date)
              const weekendClass = date.getDay() === 0 || date.getDay() === 6 ? ' weekend' : ''
              const draftClass = isDraft ? ' draft-cell' : ''
              const team = escapeRosterHtml(shiftObj?.team || '')
              return `<td class="data-col${todayClass}${weekendClass}${draftClass}">${team}${isDraft && team ? '<span class="draft-dot">*</span>' : ''}</td>`
            })
            .join('')
          return `<tr><td class="label-col">${escapeRosterHtml(shiftDef.name)}</td>${cells}</tr>`
        })
        .join('')

      return `
        <div class="month-block">
          <div class="month-label">
            ${escapeRosterHtml(monthBlock.month)}
            ${hasDraft ? '<span class="draft-badge">DRAFT</span>' : '<span class="pub-badge">PUBLISHED</span>'}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="label-col">Shift</th>${headerCols}</tr></thead>
              <tbody>${shiftRows}</tbody>
            </table>
          </div>
        </div>`
    })
    .join('')

  const popup = openWindow('', '_blank', 'width=1400,height=900')
  if (!popup) return

  popup.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Roster Schedule - ${escapeRosterHtml(scopeLabel)}</title>
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
    Period: ${escapeRosterHtml(scopeLabel)} &nbsp;-&nbsp;
    Printed by: ${escapeRosterHtml(exportedBy)} &nbsp;-&nbsp;
    ${escapeRosterHtml(now)}
  </div>
  <div class="legend">
    <div class="legend-item"><div class="legend-pub"></div> Published shift</div>
    <div class="legend-item"><div class="legend-draft"></div> Draft shift (amber = not yet published)</div>
    <div class="legend-item">* = draft indicator on cell</div>
  </div>
  ${monthBlocks}
</body>
</html>`)
  popup.document.close()
  popup.focus()
  setTimeout(() => {
    popup.print()
    popup.close()
  }, 500)
}

export const exportRosterSchedule = ({
  filteredRows = [],
  allShifts = [],
  teams = [],
  scopeLabel = '',
  exportedBy = 'Unknown',
  exportWorkbookFn = exportWorkbook,
} = {}) => {
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
  const shiftDefs = getRosterShiftDefs(allShifts)
  const shiftScheduleHeaders = shiftDefs.flatMap((shift) => [
    `${shift.name} Team`,
    `${shift.name} Status`,
  ])
  const scheduleRows = [
    ...meta,
    ['Date', 'Day of Week', ...shiftScheduleHeaders],
    ...filteredRows.map((row) => [
      row.date,
      row.dayName,
      ...shiftDefs.flatMap((shift) => {
        const shiftObj = row.shifts?.[shift.slug]
        return [
          shiftObj?.team || '-',
          shiftObj ? (row.status === 'published' ? 'Published' : 'Draft') : '-',
        ]
      }),
    ]),
  ]

  const shiftSummaryHeaders = shiftDefs.flatMap((shift) => [
    `${shift.name} Shifts`,
    `Unassigned (${shift.name})`,
  ])
  const summaryRows = [...meta, ['Month', 'Team', ...shiftSummaryHeaders]]
  const monthMap = {}
  filteredRows.forEach((row) => {
    const date = new Date(row.date)
    const monthKey = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { days: 0, teamShifts: {} }
      shiftDefs.forEach((shift) => {
        monthMap[monthKey].teamShifts[shift.slug] = {}
      })
    }
    monthMap[monthKey].days += 1
    shiftDefs.forEach((shift) => {
      const teamName = row.shifts?.[shift.slug]?.team
      if (teamName) {
        monthMap[monthKey].teamShifts[shift.slug][teamName] =
          (monthMap[monthKey].teamShifts[shift.slug][teamName] || 0) + 1
      }
    })
  })

  const allTeamNames = [...new Set(teams.map((team) => team.name))]
  Object.entries(monthMap).forEach(([month, data]) => {
    const assignedPerShift = shiftDefs.map((shift) =>
      Object.values(data.teamShifts[shift.slug]).reduce((sum, count) => sum + count, 0),
    )
    allTeamNames.forEach((name, teamIndex) => {
      summaryRows.push([
        teamIndex === 0 ? month : '',
        name,
        ...shiftDefs.flatMap((shift, shiftIndex) => [
          data.teamShifts[shift.slug][name] || 0,
          teamIndex === 0 ? data.days - assignedPerShift[shiftIndex] : '',
        ]),
      ])
    })
  })

  exportWorkbookFn({
    filename: `roster-schedule-${datestamp}.csv`,
    sheets: [
      { name: 'Schedule', headers: [], rows: scheduleRows },
      { name: 'Monthly Summary', headers: [], rows: summaryRows },
    ],
  })
}
