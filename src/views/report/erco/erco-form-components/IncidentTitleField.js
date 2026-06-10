import React from 'react'
import Select, { components as selectComponents } from 'react-select'
import { ChevronDown as ChevronDownIcon, ChevronRight, X as XIcon } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'

const ERCO_GREEN_BG = 'rgba(0, 126, 122, 0.2)'
const ERCO_GREEN_BG_HOVER = 'rgba(0, 126, 122, 0.12)'

const TitleSelectClearIndicator = (props) => (
  <selectComponents.ClearIndicator {...props}>
    <XIcon size={14} />
  </selectComponents.ClearIndicator>
)

const TitleSelectDropdownIndicator = (props) => (
  <selectComponents.DropdownIndicator {...props}>
    {props.selectProps?.menuIsOpen ? <ChevronDownIcon size={14} /> : <ChevronRight size={14} />}
  </selectComponents.DropdownIndicator>
)

const IncidentTitleField = ({
  fieldError,
  titleManager,
  incidentTitleOptions,
  incidentTitleValueOption,
  detailsValue,
  isTitleMenuOpen,
  setIsTitleMenuOpen,
  updateIncidentTitleField,
}) => (
  <div className="d-grid gap-3">
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div className="fw-semibold">Title of Incident</div>
      <CreateActionButton label="Add title" onClick={titleManager.openAddModal} />
    </div>
    <Select
      inputId="erco-incident-title"
      classNamePrefix="erco-title-select"
      placeholder="Type incident title or choose from suggestions"
      options={incidentTitleOptions}
      value={incidentTitleValueOption}
      maxMenuHeight={320}
      components={{
        ClearIndicator: TitleSelectClearIndicator,
        DropdownIndicator: TitleSelectDropdownIndicator,
      }}
      isSearchable
      openMenuOnFocus
      isClearable={Boolean(String(detailsValue || '').trim())}
      filterOption={null}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      noOptionsMessage={() => 'Title not found. Add a new title using "+ Add title".'}
      onMenuOpen={() => setIsTitleMenuOpen(true)}
      onMenuClose={() => setIsTitleMenuOpen(false)}
      onFocus={() => setIsTitleMenuOpen(true)}
      onInputChange={(value, meta) => {
        if (meta?.action !== 'input-change') return
        updateIncidentTitleField(value, 'manual')
        setIsTitleMenuOpen(true)
      }}
      onChange={(option) => {
        updateIncidentTitleField(String(option?.value || ''), option ? 'suggestion' : 'manual')
        setIsTitleMenuOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        const topMatch = incidentTitleOptions[0]
        if (!topMatch) return
        event.preventDefault()
        updateIncidentTitleField(String(topMatch.value || ''), 'suggestion')
        setIsTitleMenuOpen(false)
      }}
      formatOptionLabel={(option) => <div className="text-truncate">{option.label}</div>}
      styles={{
        container: (base) => ({
          ...base,
          minWidth: 0,
          width: '100%',
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menuList: (base) => ({
          ...base,
          maxHeight: '320px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(129, 137, 151, 0.9) transparent',
        }),
        control: (base, state) => ({
          ...base,
          minHeight: '38px',
          minWidth: 0,
          borderColor: state.isFocused
            ? 'rgba(0, 126, 122, 0.45)'
            : fieldError
              ? 'var(--cui-form-invalid-border-color, #e55353)'
              : base.borderColor,
          boxShadow: fieldError
            ? '0 0 0 0.2rem rgba(229, 83, 83, 0.25)'
            : state.isFocused
              ? '0 0 0 0.2rem rgba(0, 126, 122, 0.2)'
              : 'none',
        }),
        valueContainer: (base) => ({
          ...base,
          minWidth: 0,
        }),
        option: (base, state) => ({
          ...base,
          fontWeight: 400,
          backgroundColor: state.isSelected
            ? ERCO_GREEN_BG
            : state.isFocused
              ? ERCO_GREEN_BG_HOVER
              : base.backgroundColor,
          color: 'var(--cui-body-color, #212631)',
          cursor: 'pointer',
        }),
        singleValue: (base) => ({
          ...base,
          fontWeight: 400,
        }),
        clearIndicator: (base, state) => ({
          ...base,
          color: state.isFocused ? 'rgba(0, 126, 122, 0.9)' : 'var(--cui-secondary-color, #768192)',
          padding: '0 8px',
        }),
        dropdownIndicator: (base, state) => ({
          ...base,
          color: state.isFocused ? 'rgba(0, 126, 122, 0.9)' : 'var(--cui-secondary-color, #768192)',
          padding: '0 8px',
        }),
        indicatorSeparator: (base) => ({
          ...base,
          margin: '6px 0',
        }),
      }}
    />
  </div>
)

export default IncidentTitleField
