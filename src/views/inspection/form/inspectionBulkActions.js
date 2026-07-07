const buildCheckMap = (checks = []) =>
  new Map((Array.isArray(checks) ? checks : []).map((check) => [String(check?.id || ''), check]))

const buildVisibleIdSet = (rows = []) =>
  new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.id || '')))

const replaceVisibleChecks = (currentChecks = [], visibleRows = [], buildNextCheck) => {
  const normalizedChecks = Array.isArray(currentChecks) ? currentChecks : []
  const normalizedRows = Array.isArray(visibleRows) ? visibleRows : []
  if (normalizedRows.length === 0) return normalizedChecks

  const byId = buildCheckMap(normalizedChecks)
  const visibleIds = buildVisibleIdSet(normalizedRows)
  const nextVisibleChecks = normalizedRows.map((row) =>
    buildNextCheck(row, byId.get(String(row?.id || ''))),
  )

  return [
    ...nextVisibleChecks,
    ...normalizedChecks.filter((check) => !visibleIds.has(String(check?.id || ''))),
  ]
}

export const buildHydraulicChecksAfterMarkAll = ({
  currentChecks = [],
  visibleRows = [],
  hydraulicCheckFields = [],
  buildHydraulicCheckRow,
  buildHydraulicFillBlankOkPatch,
}) =>
  replaceVisibleChecks(currentChecks, visibleRows, (row, existing) =>
    buildHydraulicCheckRow(
      row,
      existing,
      buildHydraulicFillBlankOkPatch({ ...row, ...(existing || {}) }, hydraulicCheckFields),
      hydraulicCheckFields,
    ),
  )

export const buildHydraulicRowOkPatch = ({
  row,
  currentChecks = [],
  hydraulicCheckFields = [],
  buildHydraulicFillBlankOkPatch,
}) => {
  const existing = buildCheckMap(currentChecks).get(String(row?.id || ''))
  return buildHydraulicFillBlankOkPatch({ ...row, ...(existing || {}) }, hydraulicCheckFields)
}

export const buildErAuxChecksAfterMarkAll = ({
  currentChecks = [],
  visibleRows = [],
  buildErAuxCheckRow,
  erAuxOkPatch = {},
}) =>
  replaceVisibleChecks(currentChecks, visibleRows, (row, existing) =>
    buildErAuxCheckRow(row, existing, erAuxOkPatch),
  )

export const buildHighAngleChecksAfterMarkAll = ({
  currentChecks = [],
  visibleRows = [],
  highAngleGoodStatus = 'Good',
  mainLocation = '',
  buildHighAngleCheckRow,
  buildHighAngleFillBlankGoodPatch,
}) =>
  replaceVisibleChecks(currentChecks, visibleRows, (row, existing) =>
    buildHighAngleCheckRow(
      row,
      existing,
      buildHighAngleFillBlankGoodPatch({ ...row, ...(existing || {}) }, highAngleGoodStatus),
      { mainLocation },
    ),
  )

export const buildHighAngleRowGoodPatch = ({
  row,
  currentChecks = [],
  highAngleGoodStatus = 'Good',
  buildHighAngleFillBlankGoodPatch,
}) => {
  const existing = buildCheckMap(currentChecks).get(String(row?.id || ''))
  return buildHighAngleFillBlankGoodPatch({ ...row, ...(existing || {}) }, highAngleGoodStatus)
}

export const buildFrtChecksAfterMarkAll = ({
  currentDailyChecks = [],
  currentOneOffChecks = [],
  dailyRows = [],
  oneOffRows = [],
  frtDailyCheckedPatch = {},
  frtOneOffGoodPatch = {},
  buildFrtDailyCheckRow,
  buildFrtOneOffCheckRow,
}) => {
  const dailyById = buildCheckMap(currentDailyChecks)
  const oneOffById = buildCheckMap(currentOneOffChecks)

  return {
    frtDailyChecks: (Array.isArray(dailyRows) ? dailyRows : []).map((row) =>
      buildFrtDailyCheckRow(
        row,
        dailyById.get(String(row?.id || '')),
        row?.rowKind === 'reading' ? {} : frtDailyCheckedPatch,
      ),
    ),
    frtOneOffChecks: (Array.isArray(oneOffRows) ? oneOffRows : []).map((row) =>
      buildFrtOneOffCheckRow(row, oneOffById.get(String(row?.id || '')), frtOneOffGoodPatch),
    ),
  }
}

export const buildFrtRowOkPatch = ({ row, frtDailyCheckedPatch = {}, frtOneOffGoodPatch = {} }) => {
  if (String(row?.checklistKind || '').trim() === 'oneOff') return frtOneOffGoodPatch
  if (String(row?.rowKind || '').trim() === 'reading') return null
  return frtDailyCheckedPatch
}

export const buildScbaFormAfterMarkAll = ({
  currentForm,
  visibleSections = [],
  getScbaChecksField,
  updateScbaCustomSectionRows,
  composeScbaCheckRow,
  buildScbaFillBlankGoodPatch,
  scbaSectionFieldMap = {},
  scbaGoodStatus = 'Good',
}) => {
  const nextForm = { ...currentForm }

  ;(Array.isArray(visibleSections) ? visibleSections : []).forEach((section) => {
    const sectionKey = section?.key
    const visibleRows = Array.isArray(section?.visibleRows) ? section.visibleRows : []
    const checksFieldKey = getScbaChecksField(sectionKey)

    if (!checksFieldKey) {
      nextForm.scbaCustomSections = updateScbaCustomSectionRows(nextForm, sectionKey, (rows) =>
        replaceVisibleChecks(rows, visibleRows, (row, existing) =>
          composeScbaCheckRow(
            sectionKey,
            row,
            existing,
            buildScbaFillBlankGoodPatch(
              scbaSectionFieldMap[sectionKey] || [],
              { ...row, ...(existing || {}) },
              scbaGoodStatus,
            ),
          ),
        ),
      )
      return
    }

    const currentChecks = Array.isArray(nextForm[checksFieldKey]) ? nextForm[checksFieldKey] : []
    nextForm[checksFieldKey] = replaceVisibleChecks(currentChecks, visibleRows, (row, existing) =>
      composeScbaCheckRow(
        sectionKey,
        row,
        existing,
        buildScbaFillBlankGoodPatch(
          scbaSectionFieldMap[sectionKey] || [],
          { ...row, ...(existing || {}) },
          scbaGoodStatus,
        ),
      ),
    )
  })

  return nextForm
}
