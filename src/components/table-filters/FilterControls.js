import React, { useId } from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'
import TablePeriodSelect from 'src/components/TablePeriodSelect'

const FilterControls = ({
  filter,
  mobile = false,
  showDesktopLabels = false,
  selectClassName = '',
  labelClassName = 'text-body-secondary',
}) => {
  const generatedId = useId()
  const controlId = filter.id || `table-filter-${filter.key || 'control'}-${generatedId}`
  const label = filter.label || 'Filter'
  const accessibleLabel = filter.ariaLabel || label

  return (
    <div key={filter.key} className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
      {mobile || showDesktopLabels ? (
        <CFormLabel htmlFor={controlId} className={`small ${labelClassName} mb-0`.trim()}>
          {label}
        </CFormLabel>
      ) : null}
      <CFormSelect
        id={controlId}
        aria-label={
          filter.ariaLabel || (!mobile && !showDesktopLabels ? accessibleLabel : undefined)
        }
        size={mobile ? undefined : 'sm'}
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className={mobile ? 'w-100' : selectClassName}
      >
        {filter.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </CFormSelect>
    </div>
  )
}

const PeriodFilterControl = ({
  value,
  onChange,
  options,
  label = 'Period',
  mobile = false,
  showDesktopLabels = false,
  selectClassName = '',
  labelClassName = 'text-body-secondary',
}) => {
  const generatedId = useId()
  const controlId = `table-period-filter-${generatedId}`

  return (
    <div className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
      {mobile || showDesktopLabels ? (
        <CFormLabel htmlFor={controlId} className={`small ${labelClassName} mb-0`.trim()}>
          {label}
        </CFormLabel>
      ) : null}
      <TablePeriodSelect
        id={controlId}
        ariaLabel={mobile || showDesktopLabels ? undefined : label}
        value={value}
        onChange={onChange}
        options={options}
        size={mobile ? undefined : 'sm'}
        className={mobile ? 'w-100' : selectClassName}
      />
    </div>
  )
}

export { PeriodFilterControl }
export default FilterControls
