import React, { useCallback, useRef, useState } from 'react'
import { CBadge, CButton, CCol, CFormInput, CRow } from '@coreui/react'
import { Filter } from 'lucide-react'
import useFocusTrap from 'src/hooks/useFocusTrap'
import ActiveFilterChips from './table-filters/ActiveFilterChips'
import FilterControls, { PeriodFilterControl } from './table-filters/FilterControls'
import MobileFilterDrawer from './table-filters/MobileFilterDrawer'
import useTableFilters from './table-filters/useTableFilters'

/**
 * Generic filter bar with search + selects + clear.
 * Props:
 *  - searchValue, onSearchChange, searchPlaceholder
 *  - filters: [{ key, label, value, onChange, options: [{label, value}], defaultValue? }]
 *  - onClear, clearLabel
 */
const TableFilters = ({
  searchValue = '',
  onSearchChange = () => {},
  searchPlaceholder = 'Search',
  filters = [],
  periodValue = 'all',
  onPeriodChange = () => {},
  periodOptions = null,
  showPeriod = true,
  onClear = () => {},
  clearLabel = 'Clear',
  rowClassName = '',
  autoWidth = true,
  searchColMd = 4,
  periodColMd = 2,
  filterColMd = 3,
  clearColMd = 2,
  showDesktopLabels = false,
  labelClassName = 'text-body-secondary',
  periodLabel = 'Period',
  showActiveSummary = true,
}) => {
  const mobileFilterTriggerSize = 'calc(1.5em + 0.75rem + 2px)'
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const mobileFilterTriggerRef = useRef(null)
  const mobileFilterDrawerRef = useRef(null)
  const mobileFilterCloseRef = useRef(null)

  const {
    localSearch,
    setLocalSearch,
    resolvedPeriodOptions,
    activeFilterItems,
    isStructuredFilterActive,
    isAnyFilterActive,
  } = useTableFilters({
    searchValue,
    onSearchChange,
    filters,
    periodValue,
    onPeriodChange,
    periodOptions,
    showPeriod,
    periodLabel,
  })

  const selectClassName = autoWidth ? 'w-auto' : ''
  const buttonClassName = autoWidth ? 'w-auto' : 'w-100 w-md-auto'
  const searchColProps = autoWidth
    ? { xs: 12, md: true, className: 'flex-grow-1' }
    : { xs: 12, md: searchColMd }
  const periodColProps = autoWidth ? { xs: 6, md: 'auto' } : { xs: 6, md: periodColMd }
  const filterColProps = autoWidth ? { xs: 6, md: 'auto' } : { xs: 6, md: filterColMd }
  const clearColProps = autoWidth ? { xs: 12, md: 'auto' } : { xs: 12, md: clearColMd }
  const mobileSearchColProps = autoWidth ? { xs: true, className: 'flex-grow-1' } : { xs: true }

  const closeMobileFilters = useCallback(() => setMobileFiltersOpen(false), [])

  useFocusTrap({
    enabled: mobileFiltersOpen,
    containerRef: mobileFilterDrawerRef,
    initialFocusRef: mobileFilterCloseRef,
    returnFocusRef: mobileFilterTriggerRef,
    onEscape: closeMobileFilters,
  })

  const handleClear = () => {
    onClear()
    closeMobileFilters()
  }

  const renderPeriodControl = ({ mobile = false } = {}) =>
    showPeriod ? (
      <PeriodFilterControl
        value={periodValue}
        onChange={onPeriodChange}
        options={resolvedPeriodOptions}
        label={periodLabel}
        mobile={mobile}
        showDesktopLabels={showDesktopLabels}
        selectClassName={selectClassName}
        labelClassName={labelClassName}
      />
    ) : null

  const renderFilterControl = (filter, { mobile = false } = {}) => (
    <FilterControls
      key={filter.key}
      filter={filter}
      mobile={mobile}
      showDesktopLabels={showDesktopLabels}
      selectClassName={selectClassName}
      labelClassName={labelClassName}
    />
  )

  return (
    <>
      <CRow className={`g-2 mb-3 align-items-center ${rowClassName}`.trim()}>
        <CCol
          {...mobileSearchColProps}
          className={`${mobileSearchColProps.className || ''} d-md-none`.trim()}
        >
          <CFormInput
            className="table-filter-mobile-search"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </CCol>
        {(showPeriod || filters.length > 0 || isAnyFilterActive) && (
          <CCol xs="auto" className="d-md-none">
            <CButton
              ref={mobileFilterTriggerRef}
              color={isStructuredFilterActive ? 'primary' : 'secondary'}
              variant={isStructuredFilterActive ? undefined : 'outline'}
              className="table-filter-trigger position-relative d-inline-flex align-items-center justify-content-center"
              style={{
                width: mobileFilterTriggerSize,
                height: mobileFilterTriggerSize,
                minWidth: mobileFilterTriggerSize,
                minHeight: mobileFilterTriggerSize,
              }}
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Open filters"
            >
              <Filter size={16} />
              {activeFilterItems.length > 0 ? (
                <CBadge
                  color="danger"
                  className="position-absolute top-0 start-100 translate-middle rounded-pill"
                  style={{ fontSize: '0.78rem' }}
                >
                  {activeFilterItems.length}
                </CBadge>
              ) : null}
            </CButton>
          </CCol>
        )}

        <CCol
          {...searchColProps}
          className={`${searchColProps.className || ''} d-none d-md-block`.trim()}
        >
          <CFormInput
            size="sm"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </CCol>

        {showPeriod && (
          <CCol {...periodColProps} className="d-none d-md-block">
            {renderPeriodControl()}
          </CCol>
        )}

        {filters.map((filter) => (
          <CCol key={filter.key} {...filterColProps} className="d-none d-md-block">
            {renderFilterControl(filter)}
          </CCol>
        ))}

        {isAnyFilterActive && (
          <CCol {...clearColProps} className="d-none d-md-flex justify-content-md-end">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              className={buttonClassName}
              onClick={onClear}
            >
              {clearLabel}
            </CButton>
          </CCol>
        )}
      </CRow>

      {showActiveSummary ? <ActiveFilterChips items={activeFilterItems} /> : null}

      <MobileFilterDrawer
        drawerRef={mobileFilterDrawerRef}
        closeRef={mobileFilterCloseRef}
        visible={mobileFiltersOpen}
        onClose={closeMobileFilters}
        renderPeriodControl={renderPeriodControl}
        renderFilterControl={renderFilterControl}
        filters={filters}
        isAnyFilterActive={isAnyFilterActive}
        onClear={handleClear}
        clearLabel={clearLabel}
      />
    </>
  )
}

export default TableFilters
