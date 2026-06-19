import React from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'
import TablePeriodSelect from 'src/components/TablePeriodSelect'

const FilterControls = ({
  filter,
  mobile = false,
  showDesktopLabels = false,
  selectClassName = '',
}) => (
  <div key={filter.key} className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
    {mobile || showDesktopLabels ? (
      <CFormLabel className="small text-body-secondary mb-0">{filter.label || 'Filter'}</CFormLabel>
    ) : null}
    <CFormSelect
      size="sm"
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
}) => (
  <div className={mobile || showDesktopLabels ? 'd-grid gap-1' : ''}>
    {mobile || showDesktopLabels ? (
      <CFormLabel className="small text-body-secondary mb-0">{label}</CFormLabel>
    ) : null}
    <TablePeriodSelect
      value={value}
      onChange={onChange}
      options={options}
      className={mobile ? 'w-100' : selectClassName}
    />
  </div>
)

export { PeriodFilterControl }
export default FilterControls
