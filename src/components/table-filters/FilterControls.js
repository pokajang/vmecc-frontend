import React from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'
import TablePeriodSelect from 'src/components/TablePeriodSelect'

const FilterControls = ({
  filter,
  mobile = false,
  showDesktopLabels = false,
  selectClassName = '',
  labelClassName = 'text-body-secondary',
}) => (
  <div key={filter.key} className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
    {mobile || showDesktopLabels ? (
      <CFormLabel className={`small ${labelClassName} mb-0`.trim()}>
        {filter.label || 'Filter'}
      </CFormLabel>
    ) : null}
    <CFormSelect
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

const PeriodFilterControl = ({
  value,
  onChange,
  options,
  label = 'Period',
  mobile = false,
  showDesktopLabels = false,
  selectClassName = '',
  labelClassName = 'text-body-secondary',
}) => (
  <div className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
    {mobile || showDesktopLabels ? (
      <CFormLabel className={`small ${labelClassName} mb-0`.trim()}>{label}</CFormLabel>
    ) : null}
    <TablePeriodSelect
      value={value}
      onChange={onChange}
      options={options}
      size={mobile ? undefined : 'sm'}
      className={mobile ? 'w-100' : selectClassName}
    />
  </div>
)

export { PeriodFilterControl }
export default FilterControls
