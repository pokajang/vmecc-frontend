import { getFirstMissingInspectionField } from './inspectionFormHelpers'

const focusDomTarget = (target) => {
  if (!target) return false
  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  const focusTarget = target.querySelector?.('textarea, input, button, [tabindex]') || target
  window.setTimeout(() => focusTarget.focus?.(), 150)
  return true
}

export const focusFirstMissingInspectionField = ({ currentForm, validation = null, fieldRefs }) => {
  const firstTarget = validation?.firstTarget || null
  const firstMissing = firstTarget?.field || getFirstMissingInspectionField(currentForm)
  if (!firstMissing) return

  if (firstTarget?.rowId && String(firstMissing || '').startsWith('erAux')) {
    const row = Array.from(document.querySelectorAll('[data-inspection-er-aux-row-id]')).find(
      (element) => element.getAttribute('data-inspection-er-aux-row-id') === firstTarget.rowId,
    )
    const detailTarget =
      row && firstTarget.detailKey
        ? Array.from(row.querySelectorAll('[data-inspection-er-aux-detail-key]')).find(
            (element) =>
              element.getAttribute('data-inspection-er-aux-detail-key') === firstTarget.detailKey,
          )
        : null
    if (focusDomTarget(detailTarget || row)) return
  }

  if (firstTarget?.rowId && String(firstMissing || '').startsWith('frt')) {
    window.dispatchEvent(
      new CustomEvent('inspection:focus-frt-row', {
        detail: {
          rowId: firstTarget.rowId,
          detailKey: firstTarget.detailKey,
          checklistKind: firstTarget.checklistKind,
        },
      }),
    )
    window.setTimeout(() => {
      const row = Array.from(document.querySelectorAll('[data-inspection-frt-row-id]')).find(
        (element) => element.getAttribute('data-inspection-frt-row-id') === firstTarget.rowId,
      )
      const detailTarget =
        row && firstTarget.detailKey
          ? Array.from(row.querySelectorAll('[data-inspection-frt-detail-key]')).find(
              (element) =>
                element.getAttribute('data-inspection-frt-detail-key') === firstTarget.detailKey,
            )
          : null
      focusDomTarget(detailTarget || row)
    }, 150)
    return
  }

  if (firstTarget?.rowId) {
    const row = Array.from(document.querySelectorAll('[data-fire-extinguisher-row-id]')).find(
      (element) => element.getAttribute('data-fire-extinguisher-row-id') === firstTarget.rowId,
    )
    const checkTarget =
      row && firstTarget.checkKey
        ? Array.from(row.querySelectorAll('[data-fire-extinguisher-check-key]')).find(
            (element) =>
              element.getAttribute('data-fire-extinguisher-check-key') === firstTarget.checkKey,
          )
        : null
    const detailTarget =
      row && firstTarget.detailKey
        ? Array.from(row.querySelectorAll('[data-fire-extinguisher-detail-key]')).find(
            (element) =>
              element.getAttribute('data-fire-extinguisher-detail-key') === firstTarget.detailKey,
          )
        : null
    if (focusDomTarget(detailTarget || checkTarget || row)) return
  }

  if (firstTarget?.detailKey) {
    const target = Array.from(document.querySelectorAll('[data-hse-field]')).find(
      (element) => element.getAttribute('data-hse-field') === firstTarget.detailKey,
    )
    if (focusDomTarget(target)) return
  }

  focusDomTarget(fieldRefs[firstMissing]?.current)
}
