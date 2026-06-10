import React, { useMemo, useState } from 'react'
import { CCol, CFormInput, CRow } from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionCard from 'src/components/IconOptionCard'
import IconOptionGrid from 'src/components/IconOptionGrid'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { DetailsStepActions } from './erco-form-components'
import TypeManagerModal from './TypeManagerModal'
import { normalizeErcoLocationList } from './utils'
import { recordTypeUsage } from './typeUsageStorage'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'
import useWeatherTypeManager, { WEATHER_TOGGLE_VALUE } from './useWeatherTypeManager'
import useLocationTypeManager, { LOCATION_TOGGLE_VALUE } from './useLocationTypeManager'

const ACTIVE_CARD_BG = 'rgba(0, 126, 122, 0.2)'
const ACTIVE_CARD_BORDER = 'rgba(0, 126, 122, 0.45)'
const TOGGLE_CARD_BG = 'var(--cui-light-bg-subtle, #f8f9fa)'
const TOGGLE_CARD_BORDER = 'var(--cui-border-color, #d8dbe0)'

const ErcoSetupStep = ({
  userId,
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  datePresetOptions,
  pushToast,
  onSaveDraft,
  onContinue,
  showActions = true,
}) => {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const dateTimeSectionRef = React.useRef(null)

  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const selectedLocations = useMemo(() => normalizeErcoLocationList(form.location), [form.location])

  const incident = useIncidentTypeManager({
    userId,
    selectedType: form.incidentType,
    updateSetupField,
    pushToast,
  })

  const weather = useWeatherTypeManager({
    userId,
    selectedWeather: form.weather,
    updateSetupField,
    pushToast,
  })

  const location = useLocationTypeManager({
    userId,
    selectedLocations,
    updateSetupField,
    pushToast,
  })

  const datePresetCards = useMemo(() => datePresetOptions.slice(0, 3), [datePresetOptions])
  const isCustomDateSelected = useMemo(() => {
    const selectedDate = String(form.incidentDate || '').trim()
    if (!selectedDate) return false
    return !datePresetCards.some((option) => String(option?.value || '') === selectedDate)
  }, [datePresetCards, form.incidentDate])

  const scrollToDateTimeOnMobile = () => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 575.98px)').matches) return
    window.requestAnimationFrame(() => {
      dateTimeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const confirmDelete = () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return

    if (target.kind === 'incident') {
      incident.removeType(target.value)
      return
    }
    if (target.kind === 'weather') {
      weather.removeType(target.value)
      return
    }
    if (target.kind === 'location') {
      location.removeType(target.value)
    }
  }

  return (
    <div className="mb-3 d-grid gap-4">
      <ActionConfirmModal
        visible={Boolean(deleteTarget)}
        title="Delete Type"
        message={
          deleteTarget?.label
            ? `Delete "${deleteTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <TypeManagerModal
        visible={incident.showAddTypeModal}
        onClose={incident.closeAddModal}
        editMode={incident.incidentEditMode}
        onSetEditMode={incident.setIncidentEditMode}
        editTitle="Edit Emergency / Incident Types"
        addTitle="Add Emergency / Incident Type"
        options={incident.typeOptions}
        onStartEdit={incident.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTarget({ kind: 'incident', value, label })}
        nameLabel="Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(value) => {
          incident.setNewTypeName(value)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Flood Response"
        descriptionLabel="Short Description (Optional)"
        descriptionValue={incident.newTypeDescription}
        onChangeDescription={incident.setNewTypeDescription}
        descriptionPlaceholder="One-line subtext for this card."
        error={incident.addTypeError}
        editingKey={incident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={incident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={incident.iconOptions}
        iconValue={incident.newTypeIconKey}
        onChangeIcon={incident.setNewTypeIconKey}
      />

      <TypeManagerModal
        visible={weather.showAddWeatherModal}
        onClose={weather.closeAddModal}
        editMode={weather.weatherEditMode}
        onSetEditMode={weather.setWeatherEditMode}
        editTitle="Edit Weather Types"
        addTitle="Add Weather Type"
        options={weather.typeOptions}
        onStartEdit={weather.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTarget({ kind: 'weather', value, label })}
        nameLabel="Type Name"
        nameValue={weather.newWeatherName}
        onChangeName={(value) => {
          weather.setNewWeatherName(value)
          if (weather.addWeatherError) weather.setAddWeatherError('')
        }}
        namePlaceholder="e.g. Heavy Haze"
        descriptionLabel="Short Description (Optional)"
        descriptionValue={weather.newWeatherDescription}
        onChangeDescription={weather.setNewWeatherDescription}
        descriptionPlaceholder="One-line subtext for this card."
        error={weather.addWeatherError}
        editingKey={weather.editingWeatherTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Weather"
        onSave={weather.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={weather.iconOptions}
        iconValue={weather.newWeatherIconKey}
        onChangeIcon={weather.setNewWeatherIconKey}
      />

      <TypeManagerModal
        visible={location.showAddLocationModal}
        onClose={location.closeAddModal}
        editMode={location.locationEditMode}
        onSetEditMode={location.setLocationEditMode}
        editTitle="Edit Areas / Locations"
        addTitle="Add Area / Location"
        options={location.typeOptions}
        onStartEdit={location.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTarget({ kind: 'location', value, label })}
        nameLabel="Area Name"
        nameValue={location.newLocationName}
        onChangeName={(value) => {
          location.setNewLocationName(value)
          if (location.addLocationError) location.setAddLocationError('')
        }}
        namePlaceholder="e.g. Zone E"
        descriptionLabel="Detailed Area (Optional)"
        descriptionValue={location.newLocationDescription}
        onChangeDescription={location.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below area name."
        error={location.addLocationError}
        editingKey={location.editingLocationKey}
        editingLabel="Editing area"
        editButtonLabel="Edit Areas"
        onSave={location.saveType}
        saveLabel="Save Area"
        updateLabel="Update Area"
        showRowIcon={false}
        iconOptions={[]}
        iconValue={location.newLocationIconKey}
        onChangeIcon={location.setNewLocationIconKey}
      />

      <div className="d-grid gap-4">
        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Choose Emergency / Incident Type</div>
            <CreateActionButton label="Add type" onClick={incident.openAddModal} />
          </div>
          <IconOptionGrid
            options={incident.visibleTypeOptions}
            value={form.incidentType}
            onChange={(value) => {
              if (value === INCIDENT_TYPE_TOGGLE_VALUE) {
                incident.setShowAllIncidentTypes((prev) => !prev)
                return
              }
              recordTypeUsage(userId, 'incident', value)
              updateSetupField('incidentType', value)
            }}
            variant="compact"
            columns={{ xs: 6, md: 3 }}
            cardProps={(option, isSelected) => {
              if (option?.value === INCIDENT_TYPE_TOGGLE_VALUE) {
                return {
                  style: {
                    backgroundColor: TOGGLE_CARD_BG,
                    borderColor: TOGGLE_CARD_BORDER,
                    borderStyle: 'dashed',
                  },
                  className: 'text-primary',
                  iconContainerClassName: 'bg-white text-primary',
                  titleClassName: 'fw-semibold text-primary',
                  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
                }
              }

              return isSelected
                ? {
                    style: {
                      backgroundColor: ACTIVE_CARD_BG,
                      borderColor: ACTIVE_CARD_BORDER,
                    },
                  }
                : {}
            }}
          />
        </div>

        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Choose Weather</div>
            <CreateActionButton label="Add weather" onClick={weather.openAddModal} />
          </div>
          <IconOptionGrid
            options={weather.visibleTypeOptions}
            value={form.weather}
            onChange={(value) => {
              if (value === WEATHER_TOGGLE_VALUE) {
                weather.setShowAllWeatherTypes((prev) => !prev)
                return
              }
              recordTypeUsage(userId, 'weather', value)
              updateSetupField('weather', value)
            }}
            variant="compact"
            columns={{ xs: 6, md: 3 }}
            cardProps={(option, isSelected) => {
              if (option?.value === WEATHER_TOGGLE_VALUE) {
                return {
                  style: {
                    backgroundColor: TOGGLE_CARD_BG,
                    borderColor: TOGGLE_CARD_BORDER,
                    borderStyle: 'dashed',
                  },
                  className: 'text-primary',
                  iconContainerClassName: 'bg-white text-primary',
                  titleClassName: 'fw-semibold text-primary',
                  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
                }
              }

              return isSelected
                ? {
                    style: {
                      backgroundColor: ACTIVE_CARD_BG,
                      borderColor: ACTIVE_CARD_BORDER,
                    },
                  }
                : {}
            }}
          />
        </div>

        <div className="d-grid gap-2">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div className="fw-semibold" style={{ minWidth: 0 }}>
              <span className="d-md-none">Choose Area</span>
              <span className="d-none d-md-inline">Choose Location / Area</span>
              <span className="fw-normal text-body-secondary ms-1 d-md-none">
                (multiple allowed)
              </span>
              <span className="fw-normal text-body-secondary ms-2 d-none d-md-inline">
                (multiple selection allowed)
              </span>
            </div>
            <div className="flex-shrink-0">
              <CreateActionButton label="Add area" onClick={location.openAddModal} />
            </div>
          </div>
          <IconOptionGrid
            options={location.visibleTypeOptions}
            value={selectedLocations}
            onChange={(value) => {
              if (value === LOCATION_TOGGLE_VALUE) {
                location.setShowAllLocationTypes((prev) => !prev)
                return
              }
              const key = String(value || '').trim()
              if (!key) return
              const exists = selectedLocations.includes(key)
              const next = exists
                ? selectedLocations.filter((item) => item !== key)
                : [...selectedLocations, key]
              updateSetupField('location', next)
              if (next.length > 0) scrollToDateTimeOnMobile()
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            cardProps={(option) => {
              if (option?.value === LOCATION_TOGGLE_VALUE) {
                return {
                  style: {
                    backgroundColor: TOGGLE_CARD_BG,
                    borderColor: TOGGLE_CARD_BORDER,
                    borderStyle: 'dashed',
                  },
                  className: 'text-primary',
                  iconContainerClassName: 'bg-white text-primary',
                  titleClassName: 'fw-semibold text-primary',
                  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
                }
              }
              return {
                icon: null,
                fallbackIcon: null,
                bodyClassName: 'gap-0',
                paddingClassName: 'p-3',
              }
            }}
          />
        </div>

        <div ref={dateTimeSectionRef} className="d-grid gap-4">
          <div className="d-grid gap-2">
            <div className="fw-semibold">Choose Incident Date</div>
            <CRow className="g-2 g-md-3">
              {datePresetCards.map((option) => (
                <CCol key={String(option?.value || option?.title || '')} xs={6} md={3}>
                  <IconOptionCard
                    title={option?.title || String(option?.value || '')}
                    description={option?.description || ''}
                    selected={form.incidentDate === option?.value}
                    icon={null}
                    showDescription
                    variant="compact"
                    bodyClassName="d-flex align-items-start"
                    paddingClassName="p-3"
                    onSelect={() => updateSetupField('incidentDate', option?.value || '')}
                  />
                </CCol>
              ))}
              <CCol xs={6} md={3}>
                <div
                  className="rounded-3 border border-light-subtle h-100 w-100 p-3 d-flex flex-column justify-content-center gap-2"
                  style={
                    isCustomDateSelected
                      ? {
                          backgroundColor: ACTIVE_CARD_BG,
                          borderColor: ACTIVE_CARD_BORDER,
                        }
                      : undefined
                  }
                >
                  <div className="small text-body-secondary">Custom date</div>
                  <CFormInput
                    type="date"
                    value={form.incidentDate}
                    aria-label="Choose Incident Date"
                    invalid={Boolean(setupFieldErrors.incidentDate)}
                    onChange={(event) => updateSetupField('incidentDate', event.target.value)}
                  />
                </div>
              </CCol>
            </CRow>
            {setupFieldErrors.incidentDate ? (
              <div className="text-danger small mb-0">{setupFieldErrors.incidentDate}</div>
            ) : null}
          </div>
          <CRow className="g-2">
            <CCol xs={12} md={4}>
              <div className="fw-semibold mb-2">Choose Incident Time</div>
              <CFormInput
                type="time"
                aria-label="Choose Incident Time"
                value={form.incidentTime}
                invalid={Boolean(setupFieldErrors.incidentTime)}
                onChange={(event) => updateSetupField('incidentTime', event.target.value)}
              />
            </CCol>
          </CRow>
        </div>

        {showActions ? (
          <DetailsStepActions
            onSaveDraft={onSaveDraft}
            primaryLabel="Continue"
            primaryType="button"
            onPrimary={onContinue}
          />
        ) : null}
      </div>
    </div>
  )
}

export default ErcoSetupStep
