import { useMemo } from 'react'
import useFireExtinguisherSessionSync from './useFireExtinguisherSessionSync'

const buildEffectiveInspectionForm = ({
  catalogRowsField,
  equipmentRows,
  equipmentRowsField,
  fireExtinguisherRows,
  form,
}) => {
  if (catalogRowsField) {
    return {
      ...form,
      [catalogRowsField]: fireExtinguisherRows,
    }
  }

  if (equipmentRowsField) {
    return {
      ...form,
      [equipmentRowsField]: equipmentRows,
    }
  }

  return form
}

const useFireExtinguisherInspectionRuntime = ({
  catalogRowsField = '',
  equipmentRows = [],
  equipmentRowsField = '',
  fireExtinguisherRows = [],
  form = {},
  isFireExtinguisherCatalogInspectionForm = false,
  mainLocation = '',
  currentUserId = '',
  pushToast,
  selectedType = '',
  selectedTypeDefinition = null,
  subLocation = '',
  zone = '',
}) => {
  const baseForm = useMemo(
    () =>
      buildEffectiveInspectionForm({
        catalogRowsField,
        equipmentRows,
        equipmentRowsField,
        fireExtinguisherRows,
        form,
      }),
    [catalogRowsField, equipmentRows, equipmentRowsField, fireExtinguisherRows, form],
  )

  const baseSummary = useMemo(
    () => selectedTypeDefinition?.getSummary?.(baseForm) || null,
    [baseForm, selectedTypeDefinition],
  )

  const sessionSync = useFireExtinguisherSessionSync({
    enabled: isFireExtinguisherCatalogInspectionForm,
    inspectionType: selectedType,
    zone,
    mainLocation,
    subLocation,
    visibleRows: baseSummary?.visibleChecks || [],
    currentUserId,
    pushToast,
  })

  const displayRows = useMemo(
    () =>
      isFireExtinguisherCatalogInspectionForm
        ? sessionSync.mergeSessionStatus(fireExtinguisherRows)
        : fireExtinguisherRows,
    [fireExtinguisherRows, isFireExtinguisherCatalogInspectionForm, sessionSync],
  )

  const displayForm = useMemo(
    () =>
      buildEffectiveInspectionForm({
        catalogRowsField,
        equipmentRows,
        equipmentRowsField,
        fireExtinguisherRows: displayRows,
        form,
      }),
    [catalogRowsField, displayRows, equipmentRows, equipmentRowsField, form],
  )

  const summary = useMemo(
    () => selectedTypeDefinition?.getSummary?.(displayForm) || null,
    [displayForm, selectedTypeDefinition],
  )

  return {
    baseForm,
    baseSummary,
    displayRows,
    displayForm,
    sessionSync,
    summary,
    visibleRows: summary?.visibleChecks || [],
    refreshSessionProgress: sessionSync.refreshProgressContext,
  }
}

export default useFireExtinguisherInspectionRuntime
