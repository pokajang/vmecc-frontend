import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusableElements = (container) =>
  Array.from(container?.querySelectorAll?.(FOCUSABLE_SELECTOR) || []).filter((element) => {
    if (element.hasAttribute('disabled')) return false
    if (element.getAttribute('aria-hidden') === 'true') return false
    return true
  })

const focusSafely = (element) => {
  if (!element || typeof element.focus !== 'function') return false
  try {
    element.focus({ preventScroll: true })
    return true
  } catch {
    element.focus()
    return true
  }
}

const useFocusTrap = ({
  enabled,
  containerRef,
  initialFocusRef,
  returnFocusRef,
  onEscape,
} = {}) => {
  const wasEnabledRef = useRef(false)
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!enabled) {
      if (wasEnabledRef.current) {
        focusSafely(returnFocusRef?.current)
      }
      wasEnabledRef.current = false
      return undefined
    }

    wasEnabledRef.current = true
    const container = containerRef?.current
    const returnFocusElement = returnFocusRef?.current
    const timer = setTimeout(() => {
      const target = initialFocusRef?.current || getFocusableElements(container)[0] || container
      focusSafely(target)
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onEscapeRef.current?.(event)
        return
      }
      if (event.key !== 'Tab') return

      const currentContainer = containerRef?.current
      const focusableElements = getFocusableElements(currentContainer)
      if (focusableElements.length === 0) {
        event.preventDefault()
        focusSafely(currentContainer)
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !currentContainer?.contains(active))) {
        event.preventDefault()
        focusSafely(last)
        return
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        focusSafely(first)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      focusSafely(returnFocusElement)
      wasEnabledRef.current = false
    }
  }, [containerRef, enabled, initialFocusRef, returnFocusRef])
}

export default useFocusTrap
