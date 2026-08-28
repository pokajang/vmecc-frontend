export const focusFirstInvalidField = (root, { selector = '[aria-invalid="true"]' } = {}) => {
  if (!root) return false
  const target = root.querySelector(selector)
  if (!target) return false

  const disclosure = target.closest('details:not([open])')
  if (disclosure) disclosure.open = true

  target.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  window.requestAnimationFrame(() => target.focus?.({ preventScroll: true }))
  return true
}
