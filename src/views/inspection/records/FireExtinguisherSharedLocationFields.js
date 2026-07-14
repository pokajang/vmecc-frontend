import React, { useMemo, useState } from 'react'
import { CButton, CFormInput, CFormLabel } from '@coreui/react'
import CreatableSelect from 'react-select/creatable'

import { resolveSiteLocation } from '../domain/locations/siteLocationHierarchy'

const text = (value) => String(value || '').trim()
const toOptions = (rows = []) =>
  rows.map((row) => ({ value: row.name, label: row.displayName || row.name, node: row }))

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

const LocationSelect = ({
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
      <div className="d-flex align-items-center gap-1 mb-1">
        <span aria-hidden="true" className="small text-body-secondary">
          {step}.
        </span>
        <CFormLabel htmlFor={id} className="mb-0">
          {label}
        </CFormLabel>
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

const FireExtinguisherSharedLocationFields = ({
  value,
  onChange,
  hierarchy = [],
  createZone,
  createArea,
  createLocation,
  isLoading = false,
  loadError = '',
  onRetry,
  stagedCount = 0,
  error = '',
}) => {
  const [mutationLevel, setMutationLevel] = useState('')
  const [mutationError, setMutationError] = useState('')
  const selectedZone = useMemo(
    () => resolveSiteLocation(hierarchy, value.zoneId || value.zone, 'zone'),
    [hierarchy, value.zone, value.zoneId],
  )
  const selectedArea = useMemo(
    () =>
      resolveSiteLocation(
        selectedZone?.children || [],
        value.mainLocationId || value.mainLocation,
        'area',
      ),
    [selectedZone, value.mainLocation, value.mainLocationId],
  )
  const selectedLocation = useMemo(
    () =>
      resolveSiteLocation(
        selectedArea?.children || [],
        value.subLocationId || value.subLocation,
        'location',
      ),
    [selectedArea, value.subLocation, value.subLocationId],
  )

  const change = (zone, area, location) =>
    onChange({
      zone: zone?.name || '',
      zoneId: zone?.id || '',
      mainLocation: area?.name || '',
      mainLocationId: area?.id || '',
      subLocation: location?.name || '',
      subLocationId: location?.id || '',
    })

  const create = async (level, name, action) => {
    setMutationLevel(level)
    setMutationError('')
    try {
      const result = await action({ name: text(name) })
      const node = result.data
      if (level === 'zone') change(node, null, null)
      if (level === 'area') change(selectedZone, node, null)
      if (level === 'location') change(selectedZone, selectedArea, node)
    } catch (creationError) {
      setMutationError(creationError?.message || `Unable to add this ${level}.`)
      throw creationError
    } finally {
      setMutationLevel('')
    }
  }

  return (
    <section className="d-grid gap-2" aria-labelledby="fire-extinguisher-batch-location">
      <div id="fire-extinguisher-batch-location" className="fw-semibold">
        Shared location
      </div>
      <div className="small text-body-secondary">
        Select in order: Zone, then Main Location, then Sub-location.
      </div>
      <div className="fire-extinguisher-drawer-location-grid">
        <LocationSelect
          id="fire-extinguisher-zone"
          step={1}
          label="Zone"
          value={selectedZone}
          options={toOptions(hierarchy)}
          placeholder="Search or enter zone"
          createLabel={(input) => `+ Add new zone "${input}"`}
          isLoading={isLoading || mutationLevel === 'zone'}
          onChange={(zone) => change(zone, null, null)}
          onCreate={(name) => create('zone', name, createZone)}
        />
        <LocationSelect
          id="fire-extinguisher-main-location"
          step={2}
          label="Main Location"
          value={selectedArea}
          options={toOptions(selectedZone?.children)}
          placeholder={selectedZone ? 'Search or enter main location' : 'Select a zone first'}
          createLabel={(input) => `+ Add new area "${input}" under ${selectedZone?.displayName}`}
          emptyMessage={selectedZone ? 'No registered main location found' : 'Select a zone first'}
          isLoading={isLoading || mutationLevel === 'area'}
          isDisabled={!selectedZone}
          onChange={(area) => change(selectedZone, area, null)}
          onCreate={(name) =>
            create('area', name, (payload) => createArea(selectedZone.id, payload))
          }
        />
        <LocationSelect
          id="fire-extinguisher-sub-location"
          step={3}
          label="Sub-location"
          value={selectedLocation}
          options={toOptions(selectedArea?.children)}
          placeholder={
            selectedArea ? 'Search or enter sub-location' : 'Select a main location first'
          }
          createLabel={(input) =>
            `+ Add new location "${input}" under ${selectedArea?.displayName}`
          }
          emptyMessage={
            selectedArea ? 'No registered sub-location found' : 'Select a main location first'
          }
          isLoading={isLoading || mutationLevel === 'location'}
          isDisabled={!selectedZone || !selectedArea}
          onChange={(location) => change(selectedZone, selectedArea, location)}
          onCreate={(name) =>
            create('location', name, (payload) => createLocation(selectedArea.id, payload))
          }
        />
      </div>
      <div className="small text-body-secondary">
        {stagedCount > 0
          ? `Changing this location will update all ${stagedCount} staged ${stagedCount === 1 ? 'extinguisher' : 'extinguishers'}.`
          : 'Every extinguisher in this batch will use this location.'}
      </div>
      {loadError ? (
        <div className="d-flex flex-wrap align-items-center gap-2 small text-warning-emphasis">
          <span>{loadError}</span>
          {onRetry ? (
            <CButton color="link" size="sm" className="p-0" onClick={onRetry}>
              Retry
            </CButton>
          ) : null}
        </div>
      ) : null}
      {mutationError ? <div className="small text-danger">{mutationError}</div> : null}
      {error ? <div className="small text-danger">{error}</div> : null}
    </section>
  )
}

export default FireExtinguisherSharedLocationFields
