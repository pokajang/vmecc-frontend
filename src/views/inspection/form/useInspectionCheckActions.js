import { useMemo } from 'react'
import {
  appendInspectionText,
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getErAuxCheckSummary,
  getFrtCheckSummary,
  getHighAngleCheckSummary,
  getHydraulicCheckSummary,
  HIGH_ANGLE_STATUS_OPTIONS,
  HYDRAULIC_CHECK_FIELDS,
  toggleHseSelection,
  toggleInspectionChecklistItem,
} from './inspectionFormHelpers'
import {
  buildErAuxChecksAfterMarkAll,
  buildFrtChecksAfterMarkAll,
  buildFrtRowOkPatch,
  buildHighAngleChecksAfterMarkAll,
  buildHighAngleRowGoodPatch,
  buildHydraulicChecksAfterMarkAll,
  buildHydraulicRowOkPatch,
} from './inspectionBulkActions'
import {
  buildErAuxCheckRow,
  buildFireExtinguisherCheckRow,
  buildFrtDailyCheckRow,
  buildFrtOneOffCheckRow,
  buildHighAngleCheckRow,
  buildHighAngleFillBlankGoodPatch,
  buildHydraulicCheckRow,
  buildHydraulicFillBlankOkPatch,
} from './inspectionCheckBuilders'
import {
  buildErAuxResetPatch,
  buildFireExtinguisherResetPatch,
  buildFrtResetPatch,
  buildHighAngleResetPatch,
  buildHydraulicResetPatch,
} from './inspectionResetActions'

const useInspectionCheckActions = ({ form, getLatestForm, mainLocation, updateForm, zone }) => {
  const highAngleGoodStatus = useMemo(() => HIGH_ANGLE_STATUS_OPTIONS[0]?.value || 'Good', [])
  const frtDailyCheckedPatch = useMemo(() => ({ status: 'Checked' }), [])
  const frtOneOffGoodPatch = useMemo(() => ({ condition: 'Good' }), [])
  const erAuxOkPatch = useMemo(() => ({ condition: 'OK' }), [])

  const updateErAuxSessionMeta = (field, nextValue) => {
    if (!['erAuxInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFrtSessionMeta = (field, nextValue) => {
    if (!['frtInspectionDate', 'frtShift', 'frtDailyRemarks', 'frtOneOffRemarks'].includes(field)) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const appendDescription = (text) => {
    updateForm({
      ...form,
      description: appendInspectionText(form.description, text),
    })
  }

  const toggleChecklistChip = (label) => {
    updateForm(toggleInspectionChecklistItem(form, label))
  }

  function updateErAuxCheck(row, patch) {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.erAuxChecks) ? currentForm.erAuxChecks : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildErAuxCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      erAuxChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  function updateHydraulicCheck(row, patch) {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildHydraulicCheckRow(row, existing, patch, HYDRAULIC_CHECK_FIELDS)

    updateForm({
      ...currentForm,
      hydraulicChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  function updateFireExtinguisherCheck(row, patch) {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.fireExtinguisherChecks)
      ? currentForm.fireExtinguisherChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildFireExtinguisherCheckRow(
      row,
      existing,
      patch,
      FIRE_EXTINGUISHER_CHECK_FIELDS,
      { zone, mainLocation },
    )

    updateForm({
      ...currentForm,
      fireExtinguisherChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  function resetFireExtinguisherCheck(row) {
    updateFireExtinguisherCheck(
      row,
      buildFireExtinguisherResetPatch(FIRE_EXTINGUISHER_CHECK_FIELDS),
    )
  }

  function updateFrtCheck(row, patch) {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()

    if (String(row?.checklistKind || '').trim() === 'oneOff') {
      const currentChecks = Array.isArray(currentForm.frtOneOffChecks)
        ? currentForm.frtOneOffChecks
        : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = buildFrtOneOffCheckRow(row, existing, patch)

      updateForm({
        ...currentForm,
        frtOneOffChecks: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      })
      return
    }

    const currentChecks = Array.isArray(currentForm.frtDailyChecks)
      ? currentForm.frtDailyChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildFrtDailyCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      frtDailyChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  function resetFrtCheck(row) {
    updateFrtCheck(row, buildFrtResetPatch(row))
  }

  const addFrtItem = ({
    checklistKind = 'daily',
    compartment = '',
    equipment = '',
    quantity = '',
  } = {}) => {
    const itemName = String(equipment || '').trim()
    const targetCompartment = String(compartment || '')
      .trim()
      .toUpperCase()
    if (!itemName || !targetCompartment) return false

    const currentForm = getLatestForm()
    const timestamp = Date.now()
    const id = `custom:frt:${String(checklistKind || 'daily').trim()}:${timestamp}`
    const baseRow = {
      id,
      rowNumber: 'Custom',
      mainLocation: 'FIRE TRUCK',
      location: targetCompartment,
      compartment: targetCompartment,
      equipment: itemName,
    }

    if (String(checklistKind || '').trim() === 'oneOff') {
      const currentChecks = Array.isArray(currentForm.frtOneOffChecks)
        ? currentForm.frtOneOffChecks
        : []
      updateForm({
        ...currentForm,
        frtOneOffChecks: [
          buildFrtOneOffCheckRow({ ...baseRow, checklistKind: 'oneOff' }, null, {}),
          ...currentChecks,
        ],
      })
      return true
    }

    const currentChecks = Array.isArray(currentForm.frtDailyChecks)
      ? currentForm.frtDailyChecks
      : []
    updateForm({
      ...currentForm,
      frtDailyChecks: [
        buildFrtDailyCheckRow(
          {
            ...baseRow,
            checklistKind: 'daily',
            quantity,
            rowKind: 'status',
          },
          null,
          {},
        ),
        ...currentChecks,
      ],
    })
    return true
  }

  const deleteFrtItem = (row = {}) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId || !rowId.startsWith('custom:frt:')) return false

    const currentForm = getLatestForm()
    const isOneOff =
      String(row?.checklistKind || '').trim() === 'oneOff' || rowId.startsWith('custom:frt:oneOff:')
    const sourceKey = isOneOff ? 'frtOneOffChecks' : 'frtDailyChecks'
    const currentChecks = Array.isArray(currentForm[sourceKey]) ? currentForm[sourceKey] : []

    updateForm({
      ...currentForm,
      [sourceKey]: currentChecks.filter((check) => String(check.id || '') !== rowId),
    })
    return true
  }

  const markHydraulicEquipmentOk = (row) => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    updateHydraulicCheck(
      row,
      buildHydraulicRowOkPatch({
        row,
        currentChecks,
        hydraulicCheckFields: HYDRAULIC_CHECK_FIELDS,
        buildHydraulicFillBlankOkPatch,
      }),
    )
  }

  const markFrtRowOk = (row) => {
    const patch = buildFrtRowOkPatch({ row, frtDailyCheckedPatch, frtOneOffGoodPatch })
    if (!patch) return
    updateFrtCheck(row, patch)
  }

  const markErAuxEquipmentOk = (row) => {
    updateErAuxCheck(row, erAuxOkPatch)
  }

  function updateHighAngleCheck(row, patch) {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildHighAngleCheckRow(row, existing, patch, { mainLocation })

    updateForm({
      ...currentForm,
      highAngleChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  function resetHighAngleCheck(row) {
    updateHighAngleCheck(row, buildHighAngleResetPatch())
  }

  const markHighAngleRowOk = (row) => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    updateHighAngleCheck(
      row,
      buildHighAngleRowGoodPatch({
        row,
        currentChecks,
        highAngleGoodStatus,
        buildHighAngleFillBlankGoodPatch,
      }),
    )
  }

  function resetErAuxCheck(row) {
    updateErAuxCheck(row, buildErAuxResetPatch(row))
  }

  function resetHydraulicCheck(row) {
    updateHydraulicCheck(row, buildHydraulicResetPatch(HYDRAULIC_CHECK_FIELDS))
  }

  const updateScbaSessionMeta = (field, nextValue) => {
    if (!['scbaInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHighAngleSessionMeta = (field, nextValue) => {
    if (!['highAngleInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFireExtinguisherSessionMeta = (field, nextValue) => {
    if (!['fireExtinguisherInspectionDate'].includes(field)) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHseSessionMeta = (field, nextValue) => {
    if (!['hseInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHseField = (field, nextValue) => {
    if (
      ![
        'hseAreaConditionRemarks',
        'hseUnsafeActDetails',
        'hseUnsafeConditionDetails',
        'hseEnvironmentalDetails',
        'hseSeverity',
        'hseImmediateAction',
        'hseCorrectiveAction',
        'hseResponsiblePerson',
        'hseTargetDate',
        'hseRemarks',
      ].includes(field)
    ) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const toggleHseObservationSelection = (selection) => {
    updateForm({
      ...form,
      hseSelections: toggleHseSelection(form.hseSelections, selection),
      ...(selection === 'areaSatisfactory'
        ? {
            hseUnsafeActDetails: '',
            hseUnsafeConditionDetails: '',
            hseEnvironmentalDetails: '',
            hseSeverity: '',
            hseImmediateAction: '',
            hseCorrectiveAction: '',
            hseResponsiblePerson: '',
            hseTargetDate: '',
          }
        : { hseAreaConditionRemarks: '' }),
    })
  }

  const markAllHydraulicOk = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    const visibleRows = getHydraulicCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    updateForm({
      ...currentForm,
      hydraulicChecks: buildHydraulicChecksAfterMarkAll({
        currentChecks,
        visibleRows,
        hydraulicCheckFields: HYDRAULIC_CHECK_FIELDS,
        buildHydraulicCheckRow,
        buildHydraulicFillBlankOkPatch,
      }),
    })
  }

  const markAllErAuxOk = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.erAuxChecks) ? currentForm.erAuxChecks : []
    const visibleRows = getErAuxCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    updateForm({
      ...currentForm,
      erAuxChecks: buildErAuxChecksAfterMarkAll({
        currentChecks,
        visibleRows,
        buildErAuxCheckRow,
        erAuxOkPatch,
      }),
    })
  }

  const markAllHighAngleGood = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    const visibleRows = getHighAngleCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    updateForm({
      ...currentForm,
      highAngleChecks: buildHighAngleChecksAfterMarkAll({
        currentChecks,
        visibleRows,
        highAngleGoodStatus,
        mainLocation,
        buildHighAngleCheckRow,
        buildHighAngleFillBlankGoodPatch,
      }),
    })
  }

  const markAllFrtOk = () => {
    const currentForm = getLatestForm()
    const summary = getFrtCheckSummary(currentForm)
    const currentDailyChecks = Array.isArray(currentForm.frtDailyChecks)
      ? currentForm.frtDailyChecks
      : []
    const currentOneOffChecks = Array.isArray(currentForm.frtOneOffChecks)
      ? currentForm.frtOneOffChecks
      : []

    updateForm({
      ...currentForm,
      ...buildFrtChecksAfterMarkAll({
        currentDailyChecks,
        currentOneOffChecks,
        dailyRows: summary.dailyRows,
        oneOffRows: summary.oneOffRows,
        frtDailyCheckedPatch,
        frtOneOffGoodPatch,
        buildFrtDailyCheckRow,
        buildFrtOneOffCheckRow,
      }),
    })
  }

  return {
    appendDescription,
    addFrtItem,
    deleteFrtItem,
    markAllErAuxOk,
    markAllFrtOk,
    markAllHighAngleGood,
    markAllHydraulicOk,
    markErAuxEquipmentOk,
    markFrtRowOk,
    markHighAngleRowOk,
    markHydraulicEquipmentOk,
    resetErAuxCheck,
    resetFireExtinguisherCheck,
    resetFrtCheck,
    resetHighAngleCheck,
    resetHydraulicCheck,
    toggleChecklistChip,
    toggleHseObservationSelection,
    updateErAuxCheck,
    updateErAuxSessionMeta,
    updateFireExtinguisherCheck,
    updateFireExtinguisherSessionMeta,
    updateFrtCheck,
    updateFrtSessionMeta,
    updateHighAngleCheck,
    updateHighAngleSessionMeta,
    updateHseField,
    updateHseSessionMeta,
    updateHydraulicCheck,
    updateScbaSessionMeta,
  }
}

export default useInspectionCheckActions
