const resolveTarget = (target) => {
  if (target?.current) return target.current
  if (target && typeof target === 'object') return target
  if (typeof document === 'undefined') return null
  return document.querySelector('.inspection-form-body-start')
}

export const resetInspectionViewport = (target = null) => {
  if (typeof requestAnimationFrame !== 'function') return

  requestAnimationFrame(() => {
    const element = resolveTarget(target)
    if (!element) return

    element.scrollIntoView?.({ behavior: 'auto', block: 'start', inline: 'nearest' })
    element.focus?.({ preventScroll: true })
  })
}
