import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CButton } from '@coreui/react'

import { resolveSiteLocation } from '../domain/locations/siteLocationHierarchy'
import FireExtinguisherLocationCreatePanel from './FireExtinguisherLocationCreatePanel'
import FireExtinguisherLocationSelect from './FireExtinguisherLocationSelect'

const text = (value) => String(value || '').trim()
const toOptions = (rows = []) =>
  rows.map((row) => ({ value: row.name, label: row.displayName || row.name, node: row }))

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
  const [creationLevel, setCreationLevel] = useState('')
  const [creationName, setCreationName] = useState('')
  const [creationStatus, setCreationStatus] = useState('')
  const creationInputRef = useRef(null)
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
  const creationConfig = useMemo(() => {
    if (creationLevel === 'zone') {
      return {
        title: 'Add new zone',
        inputLabel: 'Zone name',
        submitLabel: 'Add zone',
        context: '',
      }
    }
    if (creationLevel === 'area') {
      return {
        title: 'Add new main location',
        inputLabel: 'Main location name',
        submitLabel: 'Add main location',
        context: selectedZone ? `Under ${selectedZone.displayName || selectedZone.name}` : '',
      }
    }
    if (creationLevel === 'location') {
      return {
        title: 'Add new sub-location',
        inputLabel: 'Sub-location name',
        submitLabel: 'Add sub-location',
        context: selectedArea ? `Under ${selectedArea.displayName || selectedArea.name}` : '',
      }
    }
    return null
  }, [creationLevel, selectedArea, selectedZone])

  useEffect(() => {
    if (creationConfig) creationInputRef.current?.focus()
  }, [creationConfig])

  const change = (zone, area, location) => {
    setCreationLevel('')
    setCreationName('')
    setCreationStatus('')
    setMutationError('')
    onChange({
      zone: zone?.name || '',
      zoneId: zone?.id || '',
      mainLocation: area?.name || '',
      mainLocationId: area?.id || '',
      subLocation: location?.name || '',
      subLocationId: location?.id || '',
    })
  }

  const create = async (level, name, action) => {
    setMutationLevel(level)
    setMutationError('')
    try {
      const result = await action({ name: text(name) })
      const node = result.data
      if (level === 'zone') change(node, null, null)
      if (level === 'area') change(selectedZone, node, null)
      if (level === 'location') change(selectedZone, selectedArea, node)
      return result
    } catch (creationError) {
      setMutationError(creationError?.message || `Unable to add this ${level}.`)
      throw creationError
    } finally {
      setMutationLevel('')
    }
  }

  const openCreation = (level) => {
    setCreationLevel(level)
    setCreationName('')
    setMutationError('')
    setCreationStatus('')
  }

  const cancelCreation = () => {
    if (mutationLevel) return
    setCreationLevel('')
    setCreationName('')
    setMutationError('')
  }

  const submitCreation = async (event) => {
    event.preventDefault()
    const name = text(creationName)
    if (!creationConfig || !name || mutationLevel) return

    const level = creationLevel
    const action =
      level === 'zone'
        ? createZone
        : level === 'area'
          ? (payload) => createArea(selectedZone.id, payload)
          : (payload) => createLocation(selectedArea.id, payload)

    try {
      const result = await create(level, name, action)
      const label = level === 'zone' ? 'Zone' : level === 'area' ? 'Main location' : 'Sub-location'
      setCreationStatus(
        result.created === false
          ? `${label} "${name}" already existed and was selected.`
          : `${label} "${name}" was added and selected.`,
      )
      setCreationLevel('')
      setCreationName('')
    } catch {
      creationInputRef.current?.focus()
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
        <FireExtinguisherLocationSelect
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
          onAdd={() => openCreation('zone')}
          addAriaLabel="Add new zone"
        />
        <FireExtinguisherLocationSelect
          id="fire-extinguisher-main-location"
          step={2}
          label="Main Location"
          value={selectedArea}
          options={toOptions(selectedZone?.children)}
          placeholder={selectedZone ? 'Search or enter main location' : 'Select a zone first'}
          createLabel={(input) =>
            `+ Add new main location "${input}" under ${selectedZone?.displayName}`
          }
          emptyMessage={selectedZone ? 'No registered main location found' : 'Select a zone first'}
          isLoading={isLoading || mutationLevel === 'area'}
          isDisabled={!selectedZone}
          onChange={(area) => change(selectedZone, area, null)}
          onCreate={(name) =>
            create('area', name, (payload) => createArea(selectedZone.id, payload))
          }
          onAdd={() => openCreation('area')}
          addAriaLabel="Add new main location"
        />
        <FireExtinguisherLocationSelect
          id="fire-extinguisher-sub-location"
          step={3}
          label="Sub-location"
          value={selectedLocation}
          options={toOptions(selectedArea?.children)}
          placeholder={
            selectedArea ? 'Search or enter sub-location' : 'Select a main location first'
          }
          createLabel={(input) =>
            `+ Add new sub-location "${input}" under ${selectedArea?.displayName}`
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
          onAdd={() => openCreation('location')}
          addAriaLabel="Add new sub-location"
        />
      </div>
      {creationConfig ? (
        <FireExtinguisherLocationCreatePanel
          config={creationConfig}
          name={creationName}
          error={mutationError}
          isSubmitting={Boolean(mutationLevel)}
          inputRef={creationInputRef}
          onNameChange={(name) => {
            setCreationName(name)
            setMutationError('')
          }}
          onCancel={cancelCreation}
          onSubmit={submitCreation}
        />
      ) : null}
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
      {creationStatus ? (
        <div className="small text-success" role="status">
          {creationStatus}
        </div>
      ) : null}
      {!creationConfig && mutationError ? (
        <div className="small text-danger" role="alert">
          {mutationError}
        </div>
      ) : null}
      {error ? <div className="small text-danger">{error}</div> : null}
    </section>
  )
}

export default FireExtinguisherSharedLocationFields
