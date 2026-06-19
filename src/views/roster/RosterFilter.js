import React, { useState } from 'react'
import { CButton, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

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

  const isMonthBased = rangeType === 'month'
  const showNavArrows = rangeType === 'day' || rangeType === 'week'
  const activeFilterItems = [
    search?.trim()
      ? { key: 'search', label: 'Search', value: search.trim(), onClear: () => onSearchChange('') }
      : null,
    rangeType !== 'month'
      ? { key: 'range', label: 'Range', value: rangeType, onClear: null }
      : null,
    teamFilter && teamFilter !== 'All'
      ? { key: 'team', label: 'Team', value: teamFilter, onClear: () => onTeamChange('All') }
      : null,
    isMonthBased && selectedMonths.length > 0
      ? {
          key: 'months',
          label: 'Months',
          value: `${selectedMonths.length} selected`,
          onClear: null,
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap align-items-end gap-2 mb-4">
        <div className="d-grid gap-1" style={{ minWidth: 140 }}>
          <CFormLabel htmlFor="roster-range-filter" className="small text-body-secondary mb-0">
            Range
          </CFormLabel>
          <CFormSelect
            id="roster-range-filter"
            size="sm"
            value={rangeType}
            onChange={(event) => onRangeChange(event.target.value)}
          >
            <option value="month">Monthly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="custom">Custom range</option>
          </CFormSelect>
        </div>

        {showNavArrows && (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            className="px-2 py-1"
            onClick={onPrev}
            aria-label="Previous roster period"
          >
            <ChevronLeft size={14} />
          </CButton>
        )}

        {(rangeType === 'day' || rangeType === 'week') && (
          <div className="d-grid gap-1" style={{ minWidth: 160 }}>
            <CFormLabel htmlFor="roster-date-filter" className="small text-body-secondary mb-0">
              Date
            </CFormLabel>
            <CFormInput
              id="roster-date-filter"
              size="sm"
              type="date"
              value={dateFilter}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </div>
        )}

        {rangeType === 'custom' && (
          <>
            <div className="d-grid gap-1" style={{ minWidth: 150 }}>
              <CFormLabel
                htmlFor="roster-start-date-filter"
                className="small text-body-secondary mb-0"
              >
                Start date
              </CFormLabel>
              <CFormInput
                id="roster-start-date-filter"
                size="sm"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>
            <div className="d-grid gap-1" style={{ minWidth: 150 }}>
              <CFormLabel
                htmlFor="roster-end-date-filter"
                className="small text-body-secondary mb-0"
              >
                End date
              </CFormLabel>
              <CFormInput
                id="roster-end-date-filter"
                size="sm"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            </div>
          </>
        )}

        {showNavArrows && (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            className="px-2 py-1"
            onClick={onNext}
            aria-label="Next roster period"
          >
            <ChevronRight size={14} />
          </CButton>
        )}
      </div>

      {isMonthBased &&
        monthOptions.length > 0 &&
        (() => {
          const scopeOptions = showAllMonths
            ? monthOptions
            : monthOptions.slice(-DEFAULT_MONTH_WINDOW)
          const allSelected = scopeOptions.every((month) => selectedMonths.includes(month.value))
          const toggleAll = () =>
            scopeOptions.forEach((month) => onMonthToggle(month.value, !allSelected))

          return (
            <div className="mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <span className="small text-body-secondary">Select months to view</span>
                {monthOptions.length > DEFAULT_MONTH_WINDOW && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => {
                      const next = !showAllMonths
                      setShowAllMonths(next)
                      monthOptions.forEach((month) => onMonthToggle(month.value, false))
                      const scope = next ? monthOptions : monthOptions.slice(-DEFAULT_MONTH_WINDOW)
                      scope.forEach((month) => onMonthToggle(month.value, true))
                    }}
                  >
                    {showAllMonths ? 'Show less' : `See all (${monthOptions.length} months)`}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={toggleAll}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggleAll()
                    }
                  }}
                  className={`rounded-3 border text-center ${allSelected ? 'border-secondary bg-secondary bg-opacity-10' : 'border-light-subtle'}`}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    minWidth: 64,
                    padding: '8px 12px',
                  }}
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

                {scopeOptions.map((month) => {
                  const isSelected = selectedMonths.includes(month.value)
                  const [year, monthNumber] = month.value.split('-')
                  const shortMonth = new Date(
                    Number(year),
                    Number(monthNumber) - 1,
                    1,
                  ).toLocaleDateString('en-US', { month: 'short' })
                  return (
                    <div
                      key={month.value}
                      role="button"
                      tabIndex={0}
                      onClick={() => onMonthToggle(month.value, !isSelected)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onMonthToggle(month.value, !isSelected)
                        }
                      }}
                      className={`rounded-3 border text-center ${isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
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
                        style={{ color: isSelected ? 'var(--cui-primary)' : 'inherit' }}
                      >
                        {shortMonth}
                      </div>
                      <div
                        className="small"
                        style={{
                          color: isSelected ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                        }}
                      >
                        {year}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

      <div className="d-flex flex-wrap align-items-end gap-2 mt-1">
        <div className="d-grid gap-1" style={{ minWidth: 160 }}>
          <CFormLabel htmlFor="roster-team-filter" className="small text-body-secondary mb-0">
            Team
          </CFormLabel>
          <CFormSelect
            id="roster-team-filter"
            size="sm"
            value={teamFilter}
            onChange={(event) => onTeamChange(event.target.value)}
          >
            <option value="All">All teams</option>
            {teams.map((team) => (
              <option key={team.id || team.name} value={team.name}>
                {team.name}
              </option>
            ))}
          </CFormSelect>
        </div>
        <div className="d-grid gap-1 flex-grow-1" style={{ minWidth: 180 }}>
          <CFormLabel htmlFor="roster-search-filter" className="small text-body-secondary mb-0">
            Search
          </CFormLabel>
          <CFormInput
            id="roster-search-filter"
            size="sm"
            placeholder="Search team or date"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <CButton size="sm" color="secondary" variant="outline" onClick={onClear}>
          Clear
        </CButton>
      </div>

      {activeFilterItems.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3" aria-label="Active filters">
          <span className="small text-body-secondary">Active filters:</span>
          {activeFilterItems.map((item) => (
            <span
              key={item.key}
              className="d-inline-flex align-items-center gap-1 rounded-pill border bg-body px-2 py-1 small"
            >
              <span className="text-body-secondary">{item.label}:</span>
              <span className="fw-semibold">{item.value}</span>
              {item.onClear ? (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1 text-body-secondary"
                  style={{ lineHeight: 1 }}
                  onClick={item.onClear}
                  aria-label={`Clear ${item.label} filter`}
                >
                  <X size={12} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default RosterFilter
