import React, { useMemo } from 'react'
import Select from 'react-select'
import { toStaffOptionLabel } from 'src/utils/staffSelect'

const StaffSelect = ({
  value,
  options = [],
  onChange,
  isLoading = false,
  placeholder = 'Search and select staff',
  inputId = 'staff-select',
  includeInactive = false,
  disabled = false,
  styles,
  classNamePrefix = 'react-select',
}) => {
  const selectOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((option) => ({
        value: option.key,
        label: toStaffOptionLabel(option),
        meta: option,
      })),
    [options],
  )

  const selectedOption = useMemo(
    () => selectOptions.find((option) => option.value === value) || null,
    [selectOptions, value],
  )

  return (
    <Select
      inputId={inputId}
      value={selectedOption}
      options={selectOptions}
      onChange={(option) => onChange?.(option?.value || '', option?.meta || null)}
      isClearable
      isSearchable
      isLoading={isLoading}
      isDisabled={disabled}
      placeholder={isLoading ? 'Loading staff...' : placeholder}
      classNamePrefix={classNamePrefix}
      styles={styles}
      noOptionsMessage={() =>
        includeInactive ? 'No matching staff (active/inactive)' : 'No matching active staff'
      }
    />
  )
}

export default StaffSelect
