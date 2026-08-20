import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CAlert, CButton, CCol, CFormFeedback, CFormInput, CFormLabel, CRow } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileSetupSelectorDrawer from 'src/components/report-workflow/MobileSetupSelectorDrawer'
import MobileSetupSummaryList from 'src/components/report-workflow/MobileSetupSummaryList'
import DisclosureCard from 'src/components/DisclosureCard'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { MOBILE_TYPE_TOGGLE_CARD_PROPS } from 'src/components/report-workflow/mobile-home'
import { ReportSetupActions, ReportSetupSummaryRow } from '../components/ReportWorkflowUi'
import { getLocalDateInputValue, parseLocalDateValue } from 'src/utils/localDate'
import useReportIsMobile, { REPORT_MOBILE_QUERY } from '../hooks/useReportIsMobile'
import useDrillCategoryManager, { DRILL_CATEGORY_TOGGLE_VALUE } from './useDrillCategoryManager'
import useDrillTypeManager, { DRILL_TYPE_TOGGLE_VALUE } from './useDrillTypeManager'
import useDrillLocationManager, { DRILL_LOCATION_TOGGLE_VALUE } from './useDrillLocationManager'
import useDrillEnvironmentManager, {
  DRILL_ENVIRONMENT_TOGGLE_VALUE,
} from './useDrillEnvironmentManager'
import { recordDrillTypeUsage } from './typeUsageStorage'

const TOGGLE_CARD_PROPS = {
  ...MOBILE_TYPE_TOGGLE_CARD_PROPS,
  className: `report-option-card ${MOBILE_TYPE_TOGGLE_CARD_PROPS.className}`,
}

const MOBILE_SETUP_DRAWERS = {
  type: 'type',
}

const MOBILE_SETUP_GROUP_STORAGE_KEY = 'drill_mobile_setup_group'
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
    // Session storage is only a UI hint; ignore unavailable storage.
  }
}

const DRILL_MOBILE_SETUP_GROUPS = ['type', 'categories', 'environment', 'location', 'datetime']
const getLastCompleteDrillSetupGroup = (completion) => {
  for (let i = DRILL_MOBILE_SETUP_GROUPS.length - 1; i >= 0; i--) {
    const group = DRILL_MOBILE_SETUP_GROUPS[i]
    if (completion?.[group]) return group
  }
  return ''
}

const getFirstIncompleteSetupGroup = (form) => {
  if (!String(form?.incidentType || '').trim()) return 'type'
  const categories = Array.isArray(form?.exerciseCategories) ? form.exerciseCategories : []
  if (categories.length === 0) return 'categories'
  if (!String(form?.weather || '').trim()) return 'environment'
  if (!String(form?.location || '').trim()) return 'location'
  if (!String(form?.reportDate || '').trim() || !String(form?.reportTime || '').trim())
    return 'datetime'
  return ''
}

const getInitialMobileSetupGroup = (form) => {
  const firstIncomplete = getFirstIncompleteSetupGroup(form)
  const rememberedGroup = readMobileSetupGroupHint()

  if (!firstIncomplete) return ''
  if (!rememberedGroup) return firstIncomplete
  if (firstIncomplete === 'type' || firstIncomplete === 'environment') return firstIncomplete
  if (firstIncomplete === 'location' && rememberedGroup === 'location') return rememberedGroup
  if (firstIncomplete === 'datetime' && rememberedGroup === 'datetime') return rememberedGroup
  return firstIncomplete
}

const normalizeReportDateInputValue = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }

  const parsed = parseLocalDateValue(text)
  if (parsed) return getLocalDateInputValue(parsed)

  return text
}

const DrillSetupStep = ({
  user,
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  pushToast,
  onContinue,
  blockerMessage = '',
  onRegisterMobileBackHandler,
  isSaving = false,
  showActions = true,
}) => {
  const isMobile = useReportIsMobile()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [activeMobileGroup, setActiveMobileGroup] = useState(() => getInitialMobileSetupGroup(form))
  const [mobileEditOverride, setMobileEditOverride] = useState('')
  const [desktopEditGroup, setDesktopEditGroup] = useState('')
  const [deleteTypeTarget, setDeleteTypeTarget] = useState(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null)
  const [deleteEnvironmentTarget, setDeleteEnvironmentTarget] = useState(null)
  const [activeMobileSetupDrawer, setActiveMobileSetupDrawer] = useState('')
  const [returnMobileSetupDrawer, setReturnMobileSetupDrawer] = useState('')
  const initializationRef = useRef(false)

  const updateSetupField = useCallback(
    (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    [setForm, setSetupFieldErrors],
  )

  const hasType = Boolean(String(form.incidentType || '').trim())
  const hasEnvironment = Boolean(String(form.weather || '').trim())
  const hasLocation = Boolean(String(form.location || '').trim())
  const hasDateTime =
    Boolean(String(form.reportDate || '').trim()) && Boolean(String(form.reportTime || '').trim())
  const selectedCategories = useMemo(
    () => (Array.isArray(form.exerciseCategories) ? form.exerciseCategories : []).map(String),
    [form.exerciseCategories],
  )

  const completion = useMemo(
    () => ({
      type: hasType,
      categories: selectedCategories.length > 0,
      environment: hasEnvironment,
      location: hasLocation,
      datetime: hasDateTime,
    }),
    [hasType, hasEnvironment, hasLocation, hasDateTime, selectedCategories.length],
  )

  const getFirstIncompleteGroup = React.useCallback(
    () => getFirstIncompleteSetupGroup(form),
    [form],
  )

  const resolvedActiveMobileGroup =
    activeMobileGroup &&
    (!completion[activeMobileGroup] ||
      activeMobileGroup === 'categories' ||
      activeMobileGroup === 'datetime')
      ? activeMobileGroup
      : getFirstIncompleteGroup() || activeMobileGroup
  const effectiveMobileGroup = isMobile
    ? mobileEditOverride || resolvedActiveMobileGroup
    : activeMobileGroup

  const drillType = useDrillTypeManager({
    userId: user?.id,
    selectedType: form.incidentType,
    updateSetupField,
    pushToast,
  })
  const drillLocation = useDrillLocationManager({
    userId: user?.id,
    selectedLocation: form.location,
    updateSetupField,
    pushToast,
  })
  const drillCategory = useDrillCategoryManager({
    userId: user?.id,
    selectedCategories: form.exerciseCategories,
    updateSetupField,
    pushToast,
  })
  const drillEnvironment = useDrillEnvironmentManager({
    userId: user?.id,
    selectedEnvironment: form.weather,
    updateSetupField,
    pushToast,
  })
  const mobileSetupChildDrawerVisible = drillType.showAddTypeModal

  const categorySummary = useMemo(
    () =>
      selectedCategories
        .map(
          (value) =>
            drillCategory.categoryOptions.find((option) => option.value === value)?.title || value,
        )
        .join(', '),
    [drillCategory.categoryOptions, selectedCategories],
  )

  const selectedTypeLabel = useMemo(() => {
    const value = String(form.incidentType || '').trim()
    if (!value) return ''
    return (
      drillType.typeOptions.find((option) => option.value === value)?.label ||
      drillType.typeOptions.find((option) => option.value === value)?.title ||
      value
    )
  }, [drillType.typeOptions, form.incidentType])

  const selectedEnvironmentLabel = useMemo(() => {
    const value = String(form.weather || '').trim()
    if (!value) return ''
    return (
      drillEnvironment.typeOptions.find((option) => option.value === value)?.title ||
      drillEnvironment.typeOptions.find((option) => option.value === value)?.label ||
      value
    )
  }, [drillEnvironment.typeOptions, form.weather])

  const setNextRequiredGroup = (nextForm = form) => {
    const nextSection = getFirstIncompleteSetupGroup(nextForm)
    if (isMobile) {
      rememberMobileSetupGroup(nextSection)
      setMobileEditOverride(nextSection)
      setActiveMobileGroup(nextSection)
      return
    }
    setDesktopEditGroup(nextSection)
  }

  const closeCurrentGroup = () => {
    if (isMobile) {
      setMobileEditOverride('')
      setActiveMobileGroup('')
      return
    }
    setDesktopEditGroup('')
  }

  const openSection = (section) => {
    if (isMobile && section === 'type') {
      setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)
      return
    }
    if (!isMobile) {
      setDesktopEditGroup(section)
      return
    }
    if (section) rememberMobileSetupGroup(section)
    else rememberMobileSetupGroup('')
    setMobileEditOverride(section)
    setActiveMobileGroup(section)
  }

  const shouldShowSetupEditor = (group) =>
    isMobile
      ? effectiveMobileGroup === group
      : !completion[group] || desktopEditGroup === group || setupGroupHasError(group)

  const setupGroupClassName = (group, gap = 3) =>
    `d-grid gap-${gap}${isMobile && !shouldShowSetupEditor(group) ? ' d-none' : ''}`

  const isSetupComplete =
    completion.type && completion.environment && completion.location && completion.datetime
  const isSetupEditorOpen = isMobile
    ? Boolean(effectiveMobileGroup)
    : Boolean(desktopEditGroup && desktopEditGroup !== 'categories')
  const shouldShowWorkflowActions = showActions && isSetupComplete && !isSetupEditorOpen

  const setupGroupHasError = (group) => {
    if (group === 'type') return Boolean(setupFieldErrors.incidentType)
    if (group === 'environment') return Boolean(setupFieldErrors.weather)
    if (group === 'location') return Boolean(setupFieldErrors.location)
    if (group === 'datetime') {
      return Boolean(setupFieldErrors.reportDate || setupFieldErrors.reportTime)
    }
    return false
  }

  const maybeCloseDateTimeGroup = (nextDate, nextTime) => {
    const updatedDate = String(nextDate || form.reportDate || '').trim()
    const updatedTime = String(nextTime || form.reportTime || '').trim()
    if (updatedDate && updatedTime) {
      setNextRequiredGroup({ ...form, reportDate: updatedDate, reportTime: updatedTime })
    }
  }

  const handleContinueClick = () => {
    if (isMobile) {
      const firstIncomplete = getFirstIncompleteGroup()
      rememberMobileSetupGroup(firstIncomplete)
      setMobileEditOverride('')
      setActiveMobileGroup(firstIncomplete)
    }
    onContinue?.()
  }

  const openTypeEditor = () => {
    if (isMobile) {
      setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)
      return
    }
    openSection('type')
  }

  const openTypeManagerFromDrawer = () => {
    setReturnMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)
    setActiveMobileSetupDrawer('')
    drillType.openAddModal()
  }

  const selectDrillType = (nextValue, { closeMobileDrawer = false } = {}) => {
    if (nextValue === DRILL_TYPE_TOGGLE_VALUE) {
      drillType.setShowAllDrillTypes((prev) => !prev)
      return
    }
    drillType.setShowAllDrillTypes(false)
    const value = String(nextValue || '').trim()
    if (!value) return
    updateSetupField('incidentType', value)
    recordDrillTypeUsage(user?.id, value)
    if (closeMobileDrawer) setActiveMobileSetupDrawer('')
    setNextRequiredGroup({ ...form, incidentType: value })
  }

  const resetTypeSelection = () => {
    drillType.setShowAllDrillTypes(false)
    updateSetupField('incidentType', '')
    openSection('type')
  }

  const resetCategorySelection = () => {
    drillCategory.setShowAllCategories(false)
    updateSetupField('exerciseCategories', [])
    openSection('categories')
  }

  const resetEnvironmentSelection = () => {
    drillEnvironment.setShowAllDrillEnvironments(false)
    updateSetupField('weather', '')
    setNextRequiredGroup({ ...form, weather: '' })
  }

  const resetLocationSelection = () => {
    drillLocation.setShowAllDrillLocations(false)
    updateSetupField('location', '')
    setNextRequiredGroup({ ...form, location: '' })
  }

  const resetDateTimeSelection = () => {
    updateSetupField('reportDate', '')
    updateSetupField('reportTime', '')
    setNextRequiredGroup({ ...form, reportDate: '', reportTime: '' })
  }

  const getMobileSetupBackGroup = React.useCallback(() => {
    if (!isMobile) return ''

    const orderedGroups = DRILL_MOBILE_SETUP_GROUPS
    const preferredCurrent = String(mobileEditOverride || activeMobileGroup || '').trim()
    const currentGroupIndex = orderedGroups.indexOf(preferredCurrent)
    const lastCompleteGroup = getLastCompleteDrillSetupGroup(completion)
    const lastCompleteIndex = orderedGroups.indexOf(lastCompleteGroup)
    const targetIndex =
      currentGroupIndex > 0
        ? currentGroupIndex - 1
        : currentGroupIndex === 0
          ? -1
          : lastCompleteIndex >= 0
            ? lastCompleteIndex
            : -1
    if (targetIndex < 0) return ''
    return orderedGroups[targetIndex]
  }, [activeMobileGroup, completion, isMobile, mobileEditOverride])

  const handleMobileBack = React.useCallback(() => {
    if (!isMobile) return false
    const targetGroup = getMobileSetupBackGroup()
    if (!targetGroup) return false
    setMobileEditOverride(targetGroup)
    setActiveMobileGroup(targetGroup)
    rememberMobileSetupGroup(targetGroup)
    return true
  }, [getMobileSetupBackGroup, isMobile])

  React.useEffect(() => {
    if (typeof onRegisterMobileBackHandler !== 'function') return
    onRegisterMobileBackHandler(handleMobileBack)
    return () => onRegisterMobileBackHandler(null)
  }, [handleMobileBack, onRegisterMobileBackHandler])

  const mobileDrawerReturnTimeoutRef = useRef(null)
  React.useEffect(() => {
    if (!isMobile || !returnMobileSetupDrawer || mobileSetupChildDrawerVisible) return

    if (mobileDrawerReturnTimeoutRef.current) {
      window.clearTimeout(mobileDrawerReturnTimeoutRef.current)
    }
    mobileDrawerReturnTimeoutRef.current = window.setTimeout(() => {
      setActiveMobileSetupDrawer(returnMobileSetupDrawer)
      setReturnMobileSetupDrawer('')
      mobileDrawerReturnTimeoutRef.current = null
    }, 0)

    return () => {
      if (mobileDrawerReturnTimeoutRef.current) {
        window.clearTimeout(mobileDrawerReturnTimeoutRef.current)
        mobileDrawerReturnTimeoutRef.current = null
      }
    }
  }, [isMobile, mobileSetupChildDrawerVisible, returnMobileSetupDrawer])

  React.useEffect(() => {
    if (isMobile) return
    const nextSection = getFirstIncompleteSetupGroup(form)
    const isEditingSection = Boolean(desktopEditGroup)

    if (!initializationRef.current) {
      initializationRef.current = true
      setDesktopEditGroup(nextSection)
      return
    }
    if (isEditingSection) return
    setDesktopEditGroup(nextSection)
  }, [
    desktopEditGroup,
    form,
    getFirstIncompleteGroup,
    isMobile,
    hasType,
    hasEnvironment,
    hasLocation,
    hasDateTime,
  ])

  React.useEffect(() => {
    if (!isMobile || mobileEditOverride) return
    const firstIncomplete = getFirstIncompleteGroup()
    if (
      firstIncomplete &&
      activeMobileGroup !== firstIncomplete &&
      activeMobileGroup !== 'categories'
    ) {
      setActiveMobileGroup(firstIncomplete)
      rememberMobileSetupGroup(firstIncomplete)
    }
  }, [
    activeMobileGroup,
    getFirstIncompleteGroup,
    hasType,
    hasEnvironment,
    hasLocation,
    hasDateTime,
    isMobile,
    mobileEditOverride,
  ])

  React.useEffect(() => {
    if (!isMobile) return
    const errorToGroup = {
      incidentType: 'type',
      weather: 'environment',
      location: 'location',
      reportDate: 'datetime',
      reportTime: 'datetime',
    }
    const firstErrorGroup = Object.keys(setupFieldErrors || {})
      .filter((key) => Boolean(setupFieldErrors?.[key]))
      .map((key) => errorToGroup[key])
      .find(Boolean)

    if (firstErrorGroup) {
      rememberMobileSetupGroup(firstErrorGroup)
      setMobileEditOverride(firstErrorGroup)
      setActiveMobileGroup(firstErrorGroup)
    }
  }, [isMobile, setupFieldErrors])

  React.useEffect(() => {
    const normalizedDate = normalizeReportDateInputValue(form.reportDate)
    if (!normalizedDate) {
      updateSetupField('reportDate', today)
      return
    }
    if (normalizedDate !== String(form.reportDate || '').trim()) {
      updateSetupField('reportDate', normalizedDate)
    }
  }, [form.reportDate, today, updateSetupField])

  const renderSetupSummary = (group, label, value, secondaryValue = '') => {
    if (isMobile || !completion[group] || shouldShowSetupEditor(group)) return null
    return (
      <ReportSetupSummaryRow
        label={label}
        value={value || '--'}
        secondaryValue={secondaryValue}
        showDesktop
        onEdit={() => openSection(group)}
        onReset={() => {
          if (group === 'type') resetTypeSelection()
          if (group === 'categories') resetCategorySelection()
          if (group === 'environment') resetEnvironmentSelection()
          if (group === 'location') resetLocationSelection()
          if (group === 'datetime') resetDateTimeSelection()
        }}
      />
    )
  }

  const normalizedReportDate = normalizeReportDateInputValue(form.reportDate)

  const setupSummaryDefinitions = [
    {
      key: 'type',
      group: 'type',
      label: 'Type',
      value: selectedTypeLabel,
    },
    {
      key: 'categories',
      group: 'categories',
      label: 'Exercise Categories',
      value: categorySummary || 'None selected',
    },
    {
      key: 'environment',
      group: 'environment',
      label: 'Environment',
      value: selectedEnvironmentLabel || '--',
    },
    {
      key: 'location',
      group: 'location',
      label: 'Location',
      value: form.location || '--',
    },
    {
      key: 'datetime',
      group: 'datetime',
      label: 'Date & Time',
      value: normalizedReportDate || '--',
      secondaryValue: `${form.reportTime || '--'}${form.reportIssuanceDate ? ` • Issued ${form.reportIssuanceDate}` : ''}`,
    },
  ].filter((item) => {
    if (item.group === 'datetime') {
      return hasType && Boolean(hasDateTime)
    }
    if (item.group === 'type') {
      return hasType
    }
    if (item.group === 'categories') {
      return hasType && Boolean(categorySummary)
    }
    if (item.group === 'environment') {
      return hasType && hasEnvironment
    }
    if (item.group === 'location') {
      return hasType && hasLocation
    }
    return false
  })

  const mobileSetupSummaryItems = isMobile
    ? setupSummaryDefinitions
        .filter(({ group }) => completion[group] && !shouldShowSetupEditor(group))
        .map(({ group, ...item }) => ({
          ...item,
          editLabel: `Edit ${item.label}`,
          onEdit: () => openSection(group),
        }))
    : []

  return (
    <div className="mb-3 d-grid gap-4" data-testid="drill-report-setup-ready">
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-type-manager-delete-modal"
        title="Delete Type"
        message={
          deleteTypeTarget?.label
            ? `Delete "${deleteTypeTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTypeTarget(null)}
        onConfirm={() => {
          if (deleteTypeTarget?.value) drillType.removeType(deleteTypeTarget.value)
          setDeleteTypeTarget(null)
        }}
      />

      <ActionConfirmModal
        visible={Boolean(deleteCategoryTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-category-manager-delete-modal"
        title="Delete Category"
        message={
          deleteCategoryTarget?.label
            ? `Delete "${deleteCategoryTarget.label}"? This cannot be undone.`
            : 'Delete this category?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={() => {
          if (deleteCategoryTarget?.value) drillCategory.removeCategory(deleteCategoryTarget.value)
          setDeleteCategoryTarget(null)
        }}
      />

      <ActionConfirmModal
        visible={Boolean(deleteLocationTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-location-manager-delete-modal"
        title="Delete Location"
        message={
          deleteLocationTarget?.label
            ? `Delete "${deleteLocationTarget.label}"? This cannot be undone.`
            : 'Delete this location?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteLocationTarget(null)}
        onConfirm={() => {
          if (deleteLocationTarget?.value) drillLocation.removeType(deleteLocationTarget.value)
          setDeleteLocationTarget(null)
        }}
      />

      <ActionConfirmModal
        visible={Boolean(deleteEnvironmentTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-environment-manager-delete-modal"
        title="Delete Environment"
        message={
          deleteEnvironmentTarget?.label
            ? `Delete "${deleteEnvironmentTarget.label}"? This cannot be undone.`
            : 'Delete this environment?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteEnvironmentTarget(null)}
        onConfirm={() => {
          if (deleteEnvironmentTarget?.value)
            drillEnvironment.removeType(deleteEnvironmentTarget.value)
          setDeleteEnvironmentTarget(null)
        }}
      />

      <TypeManagerModal
        visible={drillType.showAddTypeModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-type-manager-modal"
        onClose={drillType.closeAddModal}
        editMode={drillType.drillTypeEditMode}
        onSetEditMode={drillType.setDrillTypeEditMode}
        editTitle="Edit Drill Types"
        addTitle="Add Drill Type"
        options={drillType.typeOptions}
        onStartEdit={drillType.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTypeTarget({ value, label })}
        nameLabel="Drill Type Name"
        nameValue={drillType.newTypeName}
        onChangeName={(value) => {
          drillType.setNewTypeName(value)
          if (drillType.addTypeError) drillType.setAddTypeError('')
        }}
        namePlaceholder="e.g. Confined Space Drill"
        descriptionLabel="Drill type details (optional)"
        descriptionValue={drillType.newTypeDescription}
        onChangeDescription={drillType.setNewTypeDescription}
        descriptionPlaceholder="Subtext shown below type name."
        error={drillType.addTypeError}
        editingKey={drillType.editingDrillTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={drillType.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={drillType.iconOptions}
        iconValue={drillType.newTypeIconKey}
        onChangeIcon={drillType.setNewTypeIconKey}
        showIconPicker
      />

      <TypeManagerModal
        visible={drillCategory.showAddCategoryModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-category-manager-modal"
        onClose={drillCategory.closeAddModal}
        editMode={drillCategory.categoryEditMode}
        onSetEditMode={drillCategory.setCategoryEditMode}
        editTitle="Edit Exercise Categories"
        addTitle="Add Exercise Category"
        options={drillCategory.categoryOptions}
        onStartEdit={drillCategory.startEditCategory}
        onRequestDelete={({ value, label }) => setDeleteCategoryTarget({ value, label })}
        nameLabel="Exercise Category Name"
        nameValue={drillCategory.newCategoryName}
        onChangeName={(value) => {
          drillCategory.setNewCategoryName(value)
          if (drillCategory.addCategoryError) drillCategory.setAddCategoryError('')
        }}
        namePlaceholder="e.g. Medical Response"
        descriptionLabel="Exercise category details (optional)"
        descriptionValue={drillCategory.newCategoryDescription}
        onChangeDescription={drillCategory.setNewCategoryDescription}
        descriptionPlaceholder="Subtext shown below category name."
        error={drillCategory.addCategoryError}
        editingKey={drillCategory.editingCategoryKey}
        editingLabel="Editing category"
        editButtonLabel="Edit Categories"
        onSave={drillCategory.saveCategory}
        saveLabel="Save Category"
        updateLabel="Update Category"
        iconOptions={drillCategory.iconOptions}
        iconValue={drillCategory.newCategoryIconKey}
        onChangeIcon={drillCategory.setNewCategoryIconKey}
        showIconPicker
      />

      <TypeManagerModal
        visible={drillLocation.showAddLocationModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-location-manager-modal"
        onClose={drillLocation.closeAddModal}
        editMode={drillLocation.locationEditMode}
        onSetEditMode={drillLocation.setLocationEditMode}
        editTitle="Edit Drill Locations"
        addTitle="Add Drill Location"
        options={drillLocation.typeOptions}
        onStartEdit={drillLocation.startEditType}
        onRequestDelete={({ value, label }) => setDeleteLocationTarget({ value, label })}
        nameLabel="Drill Location Name"
        nameValue={drillLocation.newLocationName}
        onChangeName={(value) => {
          drillLocation.setNewLocationName(value)
          if (drillLocation.addLocationError) drillLocation.setAddLocationError('')
        }}
        namePlaceholder="e.g. Crusher bay"
        descriptionLabel="Drill location details (optional)"
        descriptionValue={drillLocation.newLocationDescription}
        onChangeDescription={drillLocation.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below location name."
        error={drillLocation.addLocationError}
        editingKey={drillLocation.editingLocationKey}
        editingLabel="Editing location"
        editButtonLabel="Edit Locations"
        onSave={drillLocation.saveType}
        saveLabel="Save Location"
        updateLabel="Update Location"
        showRowIcon={false}
      />

      <TypeManagerModal
        visible={drillEnvironment.showAddEnvironmentModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-environment-manager-modal"
        onClose={drillEnvironment.closeAddModal}
        editMode={drillEnvironment.environmentEditMode}
        onSetEditMode={drillEnvironment.setEnvironmentEditMode}
        editTitle="Edit Environments"
        addTitle="Add Environment"
        options={drillEnvironment.typeOptions}
        onStartEdit={drillEnvironment.startEditType}
        onRequestDelete={({ value, label }) => setDeleteEnvironmentTarget({ value, label })}
        nameLabel="Environment Name"
        nameValue={drillEnvironment.newEnvironmentName}
        onChangeName={(value) => {
          drillEnvironment.setNewEnvironmentName(value)
          if (drillEnvironment.addEnvironmentError) drillEnvironment.setAddEnvironmentError('')
        }}
        namePlaceholder="e.g. Indoor / Controlled"
        descriptionLabel="Environment details (optional)"
        descriptionValue={drillEnvironment.newEnvironmentDescription}
        onChangeDescription={drillEnvironment.setNewEnvironmentDescription}
        descriptionPlaceholder="Subtext shown below environment name."
        error={drillEnvironment.addEnvironmentError}
        editingKey={drillEnvironment.editingEnvironmentKey}
        editingLabel="Editing environment"
        editButtonLabel="Edit Environments"
        onSave={drillEnvironment.saveType}
        saveLabel="Save Environment"
        updateLabel="Update Environment"
        iconOptions={drillEnvironment.iconOptions}
        iconValue={drillEnvironment.newEnvironmentIconKey}
        onChangeIcon={drillEnvironment.setNewEnvironmentIconKey}
        showIconPicker
      />

      <MobileSetupSelectorDrawer
        visible={isMobile && activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.type}
        title="Change Drill Type"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="inspection-compact-action-btn"
            onClick={openTypeManagerFromDrawer}
          />
        }
        onClose={() => setActiveMobileSetupDrawer('')}
      >
        <div className="d-grid gap-3">
          <ResponsiveChoiceSelector
            isMobile
            options={drillType.visibleTypeOptions}
            value={form.incidentType}
            onChange={(nextValue) => selectDrillType(nextValue, { closeMobileDrawer: true })}
            variant="compact"
            showDescription
            toggleValue={DRILL_TYPE_TOGGLE_VALUE}
            columns={{ xs: 12 }}
            cardProps={(option) =>
              option?.value === DRILL_TYPE_TOGGLE_VALUE
                ? TOGGLE_CARD_PROPS
                : { className: 'report-option-card' }
            }
            ariaLabel="Change drill type"
          />
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            onClick={resetTypeSelection}
          >
            Clear type
          </CButton>
        </div>
      </MobileSetupSelectorDrawer>

      <div className="report-setup-grid mobile-setup-picker d-grid gap-4">
        {mobileSetupSummaryItems.length > 0 ? (
          <MobileSetupSummaryList ariaLabel="Drill setup summary" items={mobileSetupSummaryItems} />
        ) : null}

        <div
          className={setupGroupClassName('type')}
          data-drill-field="incidentType"
          aria-invalid={Boolean(setupFieldErrors.incidentType) || undefined}
        >
          {renderSetupSummary('type', 'Type', selectedTypeLabel)}
          {shouldShowSetupEditor('type') ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Drill Type</div>
                {isMobile ? (
                  <CreateActionButton label="Change type" onClick={openTypeEditor} />
                ) : null}
                {!isMobile ? (
                  <CreateActionButton label="Add type" onClick={drillType.openAddModal} />
                ) : null}
              </div>
              <ResponsiveChoiceSelector
                isMobile={isMobile}
                options={drillType.visibleTypeOptions}
                value={form.incidentType}
                onChange={selectDrillType}
                variant="compact"
                showDescription
                toggleValue={DRILL_TYPE_TOGGLE_VALUE}
                columns={{ xs: 12, md: 3 }}
                cardProps={(option) =>
                  option?.value === DRILL_TYPE_TOGGLE_VALUE
                    ? TOGGLE_CARD_PROPS
                    : { className: 'report-option-card' }
                }
                ariaLabel="Choose drill type"
              />
            </>
          ) : null}
        </div>

        <div className={setupGroupClassName('categories')}>
          {renderSetupSummary(
            'categories',
            'Exercise Categories',
            categorySummary || 'None selected',
          )}
          {shouldShowSetupEditor('categories') ? (
            <div className="d-grid gap-2" role="group" aria-labelledby="drill-category-title">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div id="drill-category-title" className="fw-semibold text-muted">
                  Exercise Categories (optional)
                </div>
                <CreateActionButton label="Add category" onClick={drillCategory.openAddModal} />
              </div>
              <ResponsiveChoiceSelector
                isMobile={isMobile}
                options={drillCategory.visibleCategoryOptions}
                value={selectedCategories}
                onChange={(nextValue) => {
                  if (nextValue === DRILL_CATEGORY_TOGGLE_VALUE) {
                    drillCategory.setShowAllCategories((prev) => !prev)
                    return
                  }
                  setForm((prev) => {
                    const current = Array.isArray(prev.exerciseCategories)
                      ? prev.exerciseCategories
                      : []
                    return {
                      ...prev,
                      exerciseCategories: current.includes(nextValue)
                        ? current.filter((value) => value !== nextValue)
                        : [...current, nextValue],
                    }
                  })
                  setSetupFieldErrors((prev) => ({ ...prev, exerciseCategories: undefined }))
                }}
                variant="compact"
                toggleValue={DRILL_CATEGORY_TOGGLE_VALUE}
                columns={{ xs: 12, md: 3 }}
                cardProps={(option) =>
                  option?.value === DRILL_CATEGORY_TOGGLE_VALUE
                    ? TOGGLE_CARD_PROPS
                    : { className: 'report-option-card' }
                }
                selectionMode="multi"
                ariaLabel="Exercise categories"
                testIdPrefix="drill-category"
              />
              <div className="report-setup-confirm-row">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNextRequiredGroup(form)
                    if (!isMobile) closeCurrentGroup()
                  }}
                >
                  Done
                </CButton>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={setupGroupClassName('environment')}
          data-drill-field="weather"
          aria-invalid={Boolean(setupFieldErrors.weather) || undefined}
        >
          {renderSetupSummary('environment', 'Environment', selectedEnvironmentLabel)}
          {shouldShowSetupEditor('environment') ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Environment / Condition</div>
                <CreateActionButton
                  label="Add environment"
                  className="inspection-compact-action-btn"
                  onClick={drillEnvironment.openAddModal}
                />
              </div>
              <ResponsiveChoiceSelector
                isMobile={isMobile}
                options={drillEnvironment.visibleTypeOptions}
                value={form.weather}
                onChange={(nextValue) => {
                  if (nextValue === DRILL_ENVIRONMENT_TOGGLE_VALUE) {
                    drillEnvironment.setShowAllDrillEnvironments((prev) => !prev)
                    return
                  }
                  drillEnvironment.setShowAllDrillEnvironments(false)
                  const value = String(nextValue || '').trim()
                  if (!value) return
                  updateSetupField('weather', value)
                  setNextRequiredGroup({ ...form, weather: value })
                }}
                variant="compact"
                toggleValue={DRILL_ENVIRONMENT_TOGGLE_VALUE}
                showDescription={false}
                columns={{ xs: 12, md: 3 }}
                cardProps={(option) =>
                  option?.value === DRILL_ENVIRONMENT_TOGGLE_VALUE
                    ? TOGGLE_CARD_PROPS
                    : { className: 'report-option-card' }
                }
                ariaLabel="Choose environment or condition"
              />
            </>
          ) : null}
        </div>

        <div
          className={setupGroupClassName('location')}
          data-drill-field="location"
          aria-invalid={Boolean(setupFieldErrors.location) || undefined}
        >
          {renderSetupSummary('location', 'Location', form.location)}
          {shouldShowSetupEditor('location') ? (
            <>
              <div className="d-grid gap-3">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold text-muted">Choose Drill Location</div>
                  <CreateActionButton label="Add location" onClick={drillLocation.openAddModal} />
                </div>
                <ResponsiveChoiceSelector
                  isMobile={isMobile}
                  options={drillLocation.visibleTypeOptions}
                  value={form.location}
                  onChange={(nextValue) => {
                    if (nextValue === DRILL_LOCATION_TOGGLE_VALUE) {
                      drillLocation.setShowAllDrillLocations((prev) => !prev)
                      return
                    }
                    drillLocation.setShowAllDrillLocations(false)
                    const next = String(nextValue || '').trim()
                    updateSetupField('location', next)
                    setNextRequiredGroup({ ...form, location: next })
                  }}
                  variant="compact"
                  showDescription
                  toggleValue={DRILL_LOCATION_TOGGLE_VALUE}
                  columns={{ xs: 12, md: 3 }}
                  cardProps={(option) =>
                    option?.value === DRILL_LOCATION_TOGGLE_VALUE
                      ? TOGGLE_CARD_PROPS
                      : { className: 'report-option-card', showDescription: true }
                  }
                />
              </div>
            </>
          ) : null}
        </div>

        <div
          className={setupGroupClassName('datetime', 4)}
          data-drill-field="reportDate"
          aria-invalid={
            Boolean(setupFieldErrors.reportDate || setupFieldErrors.reportTime) || undefined
          }
        >
          {renderSetupSummary(
            'datetime',
            'Report date',
            normalizedReportDate,
            `${form.reportTime}${
              form.reportIssuanceDate ? ` • Issued ${form.reportIssuanceDate}` : ''
            }`,
          )}
          {shouldShowSetupEditor('datetime') ? (
            <div className="d-grid gap-3">
              <CRow className="g-2">
                <CCol xs={12} md={12}>
                  <CFormLabel htmlFor="drill-report-date">Report date</CFormLabel>
                  <CFormInput
                    id="drill-report-date"
                    type="date"
                    value={form.reportDate}
                    invalid={Boolean(setupFieldErrors.reportDate)}
                    onChange={(event) => {
                      const value = event.target.value
                      updateSetupField('reportDate', value)
                      maybeCloseDateTimeGroup(value, form.reportTime)
                    }}
                  />
                  <CFormFeedback invalid>{setupFieldErrors.reportDate}</CFormFeedback>
                </CCol>
              </CRow>
              <CRow className="g-2">
                <CCol xs={12} md={12}>
                  <CFormLabel htmlFor="drill-report-time">Drill start time</CFormLabel>
                  <CFormInput
                    id="drill-report-time"
                    type="time"
                    value={form.reportTime}
                    invalid={Boolean(setupFieldErrors.reportTime)}
                    onChange={(event) => {
                      const value = event.target.value
                      updateSetupField('reportTime', value)
                      maybeCloseDateTimeGroup(form.reportDate, value)
                    }}
                  />
                  <CFormFeedback invalid>{setupFieldErrors.reportTime}</CFormFeedback>
                </CCol>
              </CRow>
              <CRow className="g-2">
                <CCol xs={12} md={12}>
                  <CFormLabel htmlFor="drill-report-issuance-date">
                    Report issuance date (optional)
                  </CFormLabel>
                  <CFormInput
                    id="drill-report-issuance-date"
                    type="date"
                    value={form.reportIssuanceDate || ''}
                    onChange={(event) => updateSetupField('reportIssuanceDate', event.target.value)}
                  />
                </CCol>
              </CRow>
              {hasDateTime ? (
                <div className="report-setup-confirm-row">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      closeCurrentGroup()
                      setNextRequiredGroup({
                        ...form,
                        reportDate: form.reportDate,
                        reportTime: form.reportTime,
                      })
                    }}
                  >
                    Confirm Date & Time
                  </CButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {blockerMessage ? (
          <CAlert color="danger" className="mb-0" role="alert">
            {blockerMessage}
          </CAlert>
        ) : null}
        {shouldShowWorkflowActions ? (
          <ReportSetupActions onContinue={handleContinueClick} isSaving={isSaving} />
        ) : null}
      </div>
    </div>
  )
}

export default DrillSetupStep
