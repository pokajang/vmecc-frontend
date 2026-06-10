import React from 'react'
import { CCol, CRow, CSpinner } from '@coreui/react'
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  LayoutGrid,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { MODULE_ACCENTS } from '../utils/chartDefaults'

const formatMyr = (amount) => {
  if (!amount) return 'MYR 0'
  return `MYR ${Number(amount).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`
}

const Tile = ({ icon: Icon, label, accentColor, primary, primaryLabel, secondary, loading }) => (
  <CCol xs={6} md={4}>
    <div
      className="rounded p-3 h-100"
      style={{ background: accentColor, color: '#fff', minHeight: '110px' }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <Icon size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: 0.85,
          }}
        >
          {label}
        </span>
      </div>
      {loading ? (
        <CSpinner size="sm" style={{ color: 'rgba(255,255,255,0.7)' }} />
      ) : (
        <>
          <div className="d-flex align-items-end flex-wrap gap-2" style={{ minHeight: '1.75rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{primary}</div>
            <div style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.9, lineHeight: 1.25 }}>
              {primaryLabel}
            </div>
          </div>
          {secondary && (
            <div
              style={{ fontSize: '0.875rem', opacity: 0.85, marginTop: '0.3rem', lineHeight: 1.25 }}
            >
              {secondary}
            </div>
          )}
        </>
      )}
    </div>
  </CCol>
)

const MyStats = ({ stats, loading }) => {
  const leave = stats?.leave ?? {}
  const overtime = stats?.overtime ?? {}
  const payroll = stats?.payroll ?? {}
  const reports = stats?.reports ?? {}
  const inspection = stats?.inspection ?? {}
  const roster = stats?.roster ?? {}

  const nextShiftLabel = roster.nextShift
    ? `${new Date(roster.nextShift.date).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })} · ${roster.nextShift.shift}`
    : 'No upcoming shift'

  return (
    <CRow xs={{ gutter: 3 }}>
      <Tile
        icon={CalendarDays}
        label="My Leave"
        accentColor={MODULE_ACCENTS.leave.base}
        primary={loading ? '—' : (leave.pending ?? 0)}
        primaryLabel="pending approval"
        secondary={
          leave.approvedDaysThisMonth
            ? `${leave.approvedDaysThisMonth} days approved this month`
            : null
        }
        loading={loading}
      />
      <Tile
        icon={Clock3}
        label="My Overtime"
        accentColor={MODULE_ACCENTS.overtime.base}
        primary={loading ? '—' : (overtime.pending ?? 0)}
        primaryLabel="pending approval"
        secondary={
          overtime.approvedHoursThisMonth
            ? `${overtime.approvedHoursThisMonth} hrs approved this month`
            : null
        }
        loading={loading}
      />
      <Tile
        icon={Wallet}
        label="My Payroll"
        accentColor={MODULE_ACCENTS.payroll.base}
        primary={loading ? '—' : (payroll.pending ?? 0)}
        primaryLabel="pending approval"
        secondary={
          payroll.approvedUnpaidCount
            ? `${payroll.approvedUnpaidCount} approved · ${formatMyr(payroll.approvedUnpaidTotalMyr)} unpaid`
            : null
        }
        loading={loading}
      />
      <Tile
        icon={TriangleAlert}
        label="My Reports"
        accentColor={MODULE_ACCENTS.reports.base}
        primary={loading ? '—' : (reports.pending ?? 0)}
        primaryLabel="pending review / approval"
        secondary={
          reports.drafts
            ? `${reports.drafts} draft${reports.drafts !== 1 ? 's' : ''} in progress`
            : null
        }
        loading={loading}
      />
      <Tile
        icon={ClipboardList}
        label="My Inspection"
        accentColor={MODULE_ACCENTS.inspection.base}
        primary={loading ? '—' : (inspection.pending ?? 0)}
        primaryLabel="pending review / approval"
        secondary={
          inspection.drafts
            ? `${inspection.drafts} draft${inspection.drafts !== 1 ? 's' : ''} in progress`
            : null
        }
        loading={loading}
      />
      <Tile
        icon={LayoutGrid}
        label="My Roster"
        accentColor={MODULE_ACCENTS.roster.base}
        primary={loading ? '—' : (roster.teamName ?? '—')}
        primaryLabel="assigned team"
        secondary={loading ? null : nextShiftLabel}
        loading={loading}
      />
    </CRow>
  )
}

export default MyStats
