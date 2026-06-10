import React, { useState } from 'react'
import { CButton, CFormInput, CFormSelect } from '@coreui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DEFAULT_MONTH_WINDOW = 6

const RosterFilter = ({
  rangeType,
  onRangeChange,
  dateFilter,
  onDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  teamFilter,
  onTeamChange,
  search,
  onSearchChange,
  monthOptions,
  selectedMonths,
  onMonthToggle,
  onClear,
  onPrev,
  onNext,
  teams = [],
}) => {
  const [showAllMonths, setShowAllMonths] = useState(false)

  // Month-based = the card picker mode; day/week/custom use the date inputs
  const isMonthBased = rangeType === 'month'
  const showNavArrows = rangeType === 'day' || rangeType === 'week'

  return (
    <div className="mb-4">
      {/* ── Row 1: View type + date navigation ─────────────────────────── */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <CFormSelect
          size="sm"
          value={rangeType}
          onChange={(e) => onRangeChange(e.target.value)}
          style={{ maxWidth: 140 }}
        >
          <option value="month">Monthly</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="custom">Custom range</option>
        </CFormSelect>

        {/* Prev / Next — day & week only */}
        {showNavArrows && (
          <CButton size="sm" color="secondary" variant="outline" className="px-2 py-1" onClick={onPrev}>
            <ChevronLeft size={14} />
          </CButton>
        )}

        {(rangeType === 'day' || rangeType === 'week') && (
          <CFormInput
            size="sm"
            type="date"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            style={{ maxWidth: 160 }}
          />
        )}

        {rangeType === 'custom' && (
          <>
            <CFormInput size="sm" type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} style={{ maxWidth: 150 }} />
            <span className="text-muted small">to</span>
            <CFormInput size="sm" type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} style={{ maxWidth: 150 }} />
          </>
        )}

        {showNavArrows && (
          <CButton size="sm" color="secondary" variant="outline" className="px-2 py-1" onClick={onNext}>
            <ChevronRight size={14} />
          </CButton>
        )}
      </div>

      {/* ── Month card picker ───────────────────────────────────────────── */}
      {isMonthBased && monthOptions.length > 0 && (() => {
        const scopeOptions = showAllMonths
          ? monthOptions
          : monthOptions.slice(-DEFAULT_MONTH_WINDOW)
        const allSelected = scopeOptions.every((m) => selectedMonths.includes(m.value))
        const toggleAll = () => scopeOptions.forEach((m) => onMonthToggle(m.value, !allSelected))

        return (
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-body-secondary">Select months to view</span>
              {monthOptions.length > DEFAULT_MONTH_WINDOW && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => {
                    const next = !showAllMonths
                    setShowAllMonths(next)
                    // reselect scope defaults
                    monthOptions.forEach((m) => onMonthToggle(m.value, false))
                    const scope = next ? monthOptions : monthOptions.slice(-DEFAULT_MONTH_WINDOW)
                    scope.forEach((m) => onMonthToggle(m.value, true))
                  }}
                >
                  {showAllMonths ? 'Show less' : `See all (${monthOptions.length} months)`}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* All / Clear */}
              <div
                role="button"
                tabIndex={0}
                onClick={toggleAll}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleAll() }}
                className={`rounded-3 border text-center ${allSelected ? 'border-secondary bg-secondary bg-opacity-10' : 'border-light-subtle'}`}
                style={{ cursor: 'pointer', userSelect: 'none', minWidth: 64, padding: '8px 12px' }}
              >
                <div className="fw-semibold" style={{ color: allSelected ? 'var(--cui-secondary-color)' : 'inherit' }}>All</div>
                <div className="small" style={{ color: 'var(--cui-secondary-color)' }}>{allSelected ? 'Clear' : 'Select'}</div>
              </div>

              {/* divider */}
              <div style={{ width: 1, background: 'var(--cui-border-color)', alignSelf: 'stretch', margin: '2px 0' }} />

              {scopeOptions.map((m) => {
                const isSelected = selectedMonths.includes(m.value)
                const [year, month] = m.value.split('-')
                const shortMonth = new Date(Number(year), Number(month) - 1, 1)
                  .toLocaleDateString('en-US', { month: 'short' })
                return (
                  <div
                    key={m.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => onMonthToggle(m.value, !isSelected)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onMonthToggle(m.value, !isSelected) }}
                    className={`rounded-3 border text-center ${isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
                    style={{ cursor: 'pointer', userSelect: 'none', flex: '1 1 0', minWidth: 64, maxWidth: 100, padding: '8px 4px' }}
                  >
                    <div className="fw-semibold" style={{ color: isSelected ? 'var(--cui-primary)' : 'inherit' }}>{shortMonth}</div>
                    <div className="small" style={{ color: isSelected ? 'var(--cui-primary)' : 'var(--cui-secondary-color)' }}>{year}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Row 2: Team filter + search ─────────────────────────────────── */}
      <div className="d-flex align-items-center gap-2 mt-1">
        <CFormSelect
          size="sm"
          style={{ maxWidth: 160 }}
          value={teamFilter}
          onChange={(e) => onTeamChange(e.target.value)}
        >
          <option value="All">All teams</option>
          {teams.map((t) => (
            <option key={t.id || t.name} value={t.name}>{t.name}</option>
          ))}
        </CFormSelect>
        <CFormInput
          size="sm"
          className="flex-grow-1"
          placeholder="Search team or date"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <CButton size="sm" color="secondary" variant="outline" onClick={onClear}>
          Clear
        </CButton>
      </div>
    </div>
  )
}

export default RosterFilter
