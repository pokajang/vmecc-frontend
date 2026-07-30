import React, { useState } from 'react'
import { CButton, CFormInput, CFormLabel } from '@coreui/react'
import { Plus } from 'lucide-react'
import CreatableSelect from 'react-select/creatable'

const text = (value) => String(value || '').trim()

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '31px',
    borderColor: state.isFocused ? 'var(--cui-primary)' : 'var(--cui-border-color)',
    boxShadow: state.isFocused ? '0 0 0 0.16rem rgba(0, 126, 122, 0.12)' : 'none',
    '&:hover': { borderColor: state.isFocused ? 'var(--cui-primary)' : 'var(--cui-border-color)' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 0.55rem' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, minHeight: '29px' }),
  menuPortal: (base) => ({ ...base, zIndex: 1100 }),
}

const FireExtinguisherLocationSelect = ({
  id,
  step,
  label,
  value,
  options,
  placeholder,
  createLabel,
  emptyMessage = 'No registered location found',
  isLoading,
  isDisabled = false,
  onChange,
  onCreate,
  onAdd,
  addAriaLabel,
}) => {
  const [inputValue, setInputValue] = useState('')
  const selected =
    options.find(
      (option) =>
        option.node?.id === value?.id ||
        (!value?.id && text(option.node?.name).toLowerCase() === text(value?.name).toLowerCase()),
    ) || null

  const create = async (name) => {
    try {
      await onCreate(name)
      setInputValue('')
    } catch {
      setInputValue(name)
    }
  }

  return (
    <div className="fire-extinguisher-location-field">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
        <div className="d-flex align-items-center gap-1">
          <span aria-hidden="true" className="small text-body-secondary">
            {step}.
          </span>
          <CFormLabel htmlFor={id} className="mb-0">
            {label}
          </CFormLabel>
        </div>
        <CButton
          type="button"
          color="link"
          size="sm"
          className="fire-extinguisher-location-field__add d-inline-flex align-items-center gap-1 px-1 py-0"
          disabled={isDisabled || isLoading}
          aria-label={addAriaLabel}
          onClick={onAdd}
        >
          <Plus size={13} aria-hidden="true" />
          Add
        </CButton>
      </div>
      {isDisabled ? (
        <CFormInput id={id} size="sm" disabled placeholder={placeholder} aria-label={label} />
      ) : (
        <CreatableSelect
          inputId={id}
          classNamePrefix="fire-extinguisher-location-select"
          value={selected}
          inputValue={inputValue}
          options={options}
          isSearchable
          isClearable
          isLoading={isLoading}
          placeholder={placeholder}
          formatCreateLabel={(input) => createLabel(input)}
          noOptionsMessage={() => emptyMessage}
          onInputChange={(next, action) => {
            if (action.action === 'input-change') setInputValue(next)
          }}
          onChange={(option) => {
            setInputValue('')
            onChange(option?.node || null)
          }}
          onCreateOption={create}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          menuPosition="fixed"
          styles={selectStyles}
        />
      )}
    </div>
  )
}

export default FireExtinguisherLocationSelect
