import React, { useMemo, useState } from 'react'
import { CButton, CCol, CFormInput, CRow } from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionCard from 'src/components/IconOptionCard'
import IconOptionGrid from 'src/components/IconOptionGrid'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { DetailsStepActions } from './erco-form-components'
import { normalizeErcoLocationList } from './utils'
import { recordTypeUsage } from './typeUsageStorage'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'
import useWeatherTypeManager, { WEATHER_TOGGLE_VALUE } from './useWeatherTypeManager'
import useLocationTypeManager, { LOCATION_TOGGLE_VALUE } from './useLocationTypeManager'
import useIsMobile from './erco-form-components/useIsMobile'

const ACTIVE_CARD_BG = 'rgba(0, 126, 122, 0.2)'
const ACTIVE_CARD_BORDER = 'rgba(0, 126, 122, 0.45)'
const TOGGLE_CARD_BG = 'var(--cui-light-bg-subtle, #f8f9fa)'
const TOGGLE_CARD_BORDER = 'var(--cui-border-color, #d8dbe0)'
const MOBILE_SETUP_GROUP_STORAGE_KEY = 'erco_mobile_setup_group'
let mobileSetupGroupHint = ''

const readMobileSetupGroupHint = () => {
  try {
    return String(window.sessionStorage?.getItem(MOBILE_SETUP_GROUP_STORAGE_KEY) || '')
  } catch {
    return mobileSetupGroupHint
  }
}

const rememberMobileSetupGroup = (group) => {
  mobileSetupGroupHint = String(group || '')
  try {
    if (mobileSetupGroupHint) {
      window.sessionStorage?.setItem(MOBILE_SETUP_GROUP_STORAGE_KEY, mobileSetupGroupHint)
    } else {
      window.sessionStorage?.removeItem(MOBILE_SETUP_GROUP_STORAGE_KEY)
    }
  } catch {
    // Session storage is only a progressive UI hint; ignore unavailable storage.
  }
}

const getFirstIncompleteSetupGroup = (form) => {
  if (!String(form?.incidentType || '').trim()) return 'incident'
  if (!String(form?.weather || '').trim()) return 'weather'
  if (normalizeErcoLocationList(form?.location).length === 0) return 'area'
  const hasIncidentDate = Boolean(String(form?.incidentDate || '').trim())
  const hasIncidentTime = Boolean(String(form?.incidentTime || '').trim())
  if (!hasIncidentDate && !hasIncidentTime) return 'area'
  if (!hasIncidentDate || !hasIncidentTime) return 'datetime'
  return ''
}

const getInitialMobileSetupGroup = (form) => {
  const firstIncomplete = getFirstIncompleteSetupGroup(form)
  const rememberedGroup = readMobileSetupGroupHint()
  if (!rememberedGroup) return firstIncomplete
  if (firstIncomplete === 'incident' || firstIncomplete === 'weather') return firstIncomplete
  if (firstIncomplete === 'area') return 'area'
  if (firstIncomplete === 'datetime') {
    return rememberedGroup === 'area' || rememberedGroup === 'datetime'
      ? rememberedGroup
      : 'datetime'
  }
  return rememberedGroup
}

const SetupSummaryRow = ({ label, value, detail, onEdit }) => (
  <div className="erco-mobile-setup-summary d-md-none">
    <button
      type="button"
      className="erco-mobile-setup-summary__main"
      onClick={onEdit}
      aria-label={`Edit ${label}`}
    >
      <span className="erco-mobile-setup-summary__label">{label}</span>
      <span className="erco-mobile-setup-summary__value">{value || '--'}</span>
      {detail ? <span className="erco-mobile-setup-summary__detail">{detail}</span> : null}
    </button>
    <CButton type="button" color="secondary" variant="outline" size="sm" onClick={onEdit}>
      Edit
    </CButton>
  </div>
)

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
  const isMobile = useIsMobile()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isIncidentTypeEditing, setIsIncidentTypeEditing] = useState(
    () => !String(form.incidentType || '').trim(),
  )
  const [activeMobileGroup, setActiveMobileGroup] = useState(() => getInitialMobileSetupGroup(form))
  const [mobileEditOverride, setMobileEditOverride] = useState('')

  const updateSetupField = (field, value) => {
    if (field === 'incidentDate' || field === 'incidentTime') {
      rememberMobileSetupGroup('datetime')
    }
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    if (field === 'incidentDate' || field === 'incidentTime') {
      setMobileEditOverride('datetime')
      setActiveMobileGroup('datetime')
    }
  }

  const selectedLocations = useMemo(() => normalizeErcoLocationList(form.location), [form.location])

  const incident = useIncidentTypeManager({
    userId,
    selectedType: form.incidentType,
    updateSetupField,
    pushToast,
  })

  const selectedIncidentOption = useMemo(
    () =>
      incident.typeOptions.find(
        (option) => String(option?.value || '') === String(form.incidentType || ''),
      ) || null,
    [form.incidentType, incident.typeOptions],
  )

  const weather = useWeatherTypeManager({
    userId,
    selectedWeather: form.weather,
    updateSetupField,
    pushToast,
  })

  const selectedWeatherOption = useMemo(
    () =>
      weather.typeOptions.find(
        (option) => String(option?.value || '') === String(form.weather || ''),
      ) || null,
    [form.weather, weather.typeOptions],
  )

  const location = useLocationTypeManager({
    userId,
    selectedLocations,
    updateSetupField,
    pushToast,
  })

  const datePresetCards = useMemo(() => datePresetOptions.slice(0, 3), [datePresetOptions])
  const selectedLocationLabels = useMemo(
    () =>
      selectedLocations
        .map((value) => {
          const option = location.typeOptions.find(
            (row) => String(row?.value || '') === String(value || ''),
          )
          return option?.label || option?.title || value
        })
        .filter(Boolean),
    [location.typeOptions, selectedLocations],
  )
  const completion = useMemo(
    () => ({
      incident: Boolean(String(form.incidentType || '').trim()),
      weather: Boolean(String(form.weather || '').trim()),
      area: selectedLocations.length > 0,
      datetime:
        Boolean(String(form.incidentDate || '').trim()) &&
        Boolean(String(form.incidentTime || '').trim()),
    }),
    [
      form.incidentDate,
      form.incidentTime,
      form.incidentType,
      form.weather,
      selectedLocations.length,
    ],
  )
  const isCustomDateSelected = useMemo(() => {
    const selectedDate = String(form.incidentDate || '').trim()
    if (!selectedDate) return false
    return !datePresetCards.some((option) => String(option?.value || '') === selectedDate)
  }, [datePresetCards, form.incidentDate])

  const getFirstIncompleteGroup = React.useCallback(
    () => getFirstIncompleteSetupGroup(form),
    [form],
  )
  const resolvedActiveMobileGroup =
    activeMobileGroup &&
    (!completion[activeMobileGroup] ||
      activeMobileGroup === 'area' ||
      activeMobileGroup === 'datetime')
      ? activeMobileGroup
      : getFirstIncompleteGroup() || activeMobileGroup
  const effectiveMobileGroup = isMobile
    ? mobileEditOverride || resolvedActiveMobileGroup
    : activeMobileGroup

  React.useEffect(() => {
    if (!isMobile || mobileEditOverride) return
    const firstIncomplete = getFirstIncompleteGroup()
    if (
      firstIncomplete &&
      activeMobileGroup !== firstIncomplete &&
      activeMobileGroup !== 'area' &&
      activeMobileGroup !== 'datetime'
    ) {
      setActiveMobileGroup(firstIncomplete)
    }
  }, [activeMobileGroup, getFirstIncompleteGroup, isMobile, mobileEditOverride])

  React.useEffect(() => {
    if (!isMobile) return
    const errorToGroup = {
      incidentType: 'incident',
      weather: 'weather',
      location: 'area',
      incidentDate: 'datetime',
      incidentTime: 'datetime',
    }
    const firstErrorGroup = Object.keys(setupFieldErrors || {})
      .filter((key) => Boolean(setupFieldErrors?.[key]))
      .map((key) => errorToGroup[key])
      .find(Boolean)
    if (firstErrorGroup) {
      rememberMobileSetupGroup(firstErrorGroup)
      setMobileEditOverride('')
      setActiveMobileGroup(firstErrorGroup)
    }
  }, [isMobile, setupFieldErrors])

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

  const shouldShowMobileEditor = (group) => !isMobile || effectiveMobileGroup === group

  const handleContinueClick = () => {
    if (isMobile) {
      const firstIncomplete = getFirstIncompleteGroup()
      rememberMobileSetupGroup(firstIncomplete)
      setMobileEditOverride('')
      if (firstIncomplete) setActiveMobileGroup(firstIncomplete)
    }
    onContinue?.()
  }

  const renderMobileSummary = (group, label, value, detail = '') => {
    if (!isMobile || !completion[group] || effectiveMobileGroup === group) return null
    return (
      <SetupSummaryRow
        label={label}
        value={value}
        detail={detail}
        onEdit={() => {
          rememberMobileSetupGroup(group)
          setMobileEditOverride(group)
          setActiveMobileGroup(group)
          if (group === 'incident') setIsIncidentTypeEditing(true)
        }}
      />
    )
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
        nameLabel="Emergency / Incident Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(value) => {
          incident.setNewTypeName(value)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Flood Response"
        descriptionLabel="Emergency / Incident Details (Optional)"
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
        showIconPicker
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
        nameLabel="Weather Type Name"
        nameValue={weather.newWeatherName}
        onChangeName={(value) => {
          weather.setNewWeatherName(value)
          if (weather.addWeatherError) weather.setAddWeatherError('')
        }}
        namePlaceholder="e.g. Heavy Haze"
        descriptionLabel="Weather Details (Optional)"
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
        showIconPicker
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
        nameLabel="Location / Area Name"
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

      <div className="erco-mobile-setup-grid d-grid gap-4">
        <div className="d-grid gap-2">
          {renderMobileSummary(
            'incident',
            'Incident Type',
            selectedIncidentOption?.label || form.incidentType,
            selectedIncidentOption?.description || '',
          )}
          {shouldShowMobileEditor('incident') ? (
            form.incidentType && !isIncidentTypeEditing && !isMobile ? (
              <div className="rounded-3 border bg-white p-3 d-flex align-items-center justify-content-between gap-3">
                <div className="min-w-0">
                  <div className="small text-body-secondary">Choose Emergency / Incident Type</div>
                  <div className="fw-semibold text-truncate">
                    {selectedIncidentOption?.label || form.incidentType}
                  </div>
                  {selectedIncidentOption?.description ? (
                    <div className="small text-body-secondary text-truncate">
                      {selectedIncidentOption.description}
                    </div>
                  ) : null}
                </div>
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsIncidentTypeEditing(true)}
                >
                  Edit
                </CButton>
              </div>
            ) : (
              <>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold">
                    <span className="d-md-none">Choose Incident Type</span>
                    <span className="d-none d-md-inline">Choose Emergency / Incident Type</span>
                  </div>
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
                    setIsIncidentTypeEditing(false)
                    rememberMobileSetupGroup('weather')
                    setMobileEditOverride('')
                    setActiveMobileGroup('weather')
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
              </>
            )
          ) : null}
        </div>

        <div className="d-grid gap-2">
          {renderMobileSummary(
            'weather',
            'Weather',
            selectedWeatherOption?.label || selectedWeatherOption?.title || form.weather,
            selectedWeatherOption?.description || '',
          )}
          {shouldShowMobileEditor('weather') ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold">
                  <span className="d-md-none">Weather</span>
                  <span className="d-none d-md-inline">Choose Weather</span>
                </div>
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
                  rememberMobileSetupGroup('area')
                  setMobileEditOverride('')
                  setActiveMobileGroup('area')
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
            </>
          ) : null}
        </div>

        <div className="d-grid gap-2">
          {renderMobileSummary(
            'area',
            'Area',
            selectedLocationLabels.length === 1
              ? selectedLocationLabels[0]
              : `${selectedLocationLabels.length} areas selected`,
            selectedLocationLabels.length > 1 ? selectedLocationLabels.join(', ') : '',
          )}
          {shouldShowMobileEditor('area') ? (
            <>
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
                <div className="flex-shrink-0 d-inline-flex align-items-center gap-2">
                  {isMobile && selectedLocations.length > 0 ? (
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        rememberMobileSetupGroup('datetime')
                        setMobileEditOverride('')
                        setActiveMobileGroup('datetime')
                      }}
                    >
                      Done
                    </CButton>
                  ) : null}
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
                  rememberMobileSetupGroup('area')
                  updateSetupField('location', next)
                  setMobileEditOverride('area')
                  setActiveMobileGroup('area')
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
            </>
          ) : null}
        </div>

        <div className="d-grid gap-4">
          {renderMobileSummary(
            'datetime',
            'Date & Time',
            `${form.incidentDate || '--'} ${form.incidentTime || ''}`.trim(),
          )}
          {shouldShowMobileEditor('datetime') ? (
            <>
              <div className="d-grid gap-2">
                <div className="fw-semibold">
                  <span className="d-md-none">Incident Date</span>
                  <span className="d-none d-md-inline">Choose Incident Date</span>
                </div>
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
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                    <div className="fw-semibold">
                      <span className="d-md-none">Incident Time</span>
                      <span className="d-none d-md-inline">Choose Incident Time</span>
                    </div>
                    {isMobile && completion.datetime ? (
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          rememberMobileSetupGroup('')
                          setMobileEditOverride('')
                          setActiveMobileGroup('')
                        }}
                      >
                        Done
                      </CButton>
                    ) : null}
                  </div>
                  <CFormInput
                    type="time"
                    aria-label="Choose Incident Time"
                    value={form.incidentTime}
                    invalid={Boolean(setupFieldErrors.incidentTime)}
                    onChange={(event) => updateSetupField('incidentTime', event.target.value)}
                  />
                </CCol>
              </CRow>
            </>
          ) : null}
        </div>

        {showActions ? (
          <DetailsStepActions
            onSaveDraft={onSaveDraft}
            primaryLabel="Continue"
            primaryType="button"
            onPrimary={handleContinueClick}
          />
        ) : null}
      </div>
    </div>
  )
}

export default ErcoSetupStep
