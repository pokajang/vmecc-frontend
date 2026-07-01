export const TOUR_LAYER_Z_INDEX = 2000
export const TOUR_READY_NOTICE_DELAY_MS = 300
export const TOUR_SCROLL_OFFSET = 90

export const waitForNextFrame = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve())
      return
    }

    window.setTimeout(resolve, 0)
  })

export const isElementVisible = (element) => {
  if (!element || typeof window === 'undefined') return false
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  const intersectsViewport =
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    intersectsViewport &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  )
}

export const isElementDisplayed = (element) => {
  if (!element || typeof window === 'undefined') return false
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  )
}

export const getVisibleElement = (selector) => {
  if (typeof document === 'undefined' || !selector) return null
  return Array.from(document.querySelectorAll(selector)).find(isElementVisible) || null
}

export const getDisplayedElement = (selector) => {
  if (typeof document === 'undefined' || !selector) return null
  return Array.from(document.querySelectorAll(selector)).find(isElementDisplayed) || null
}

export const getOnboardingTargetElement = (selector, { allowOffscreen = false } = {}) =>
  getVisibleElement(selector) || (allowOffscreen ? getDisplayedElement(selector) : null)

export const resolveTourTarget = (step) =>
  getOnboardingTargetElement(step.targetSelector, {
    allowOffscreen: Boolean(step?.allowOffscreenTarget),
  }) ||
  getOnboardingTargetElement(step.fallbackSelector, {
    allowOffscreen: Boolean(step?.allowOffscreenTarget),
  })

export const createTourTargetResolver = (step) => () => resolveTourTarget(step)

const matchesRoutePattern = (step, pathname = '') => {
  if (!step?.routePattern) return true
  const currentPathname = String(pathname || '').trim()
  if (!currentPathname) return false
  return step.routePattern.test(currentPathname)
}

export const buildVisibleTourSteps = (definitions, options = {}) =>
  definitions
    .filter((step) => matchesRoutePattern(step, options.pathname))
    .map((step) => {
      const target = resolveTourTarget(step)
      if (!target) return null
      const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768

      return {
        ...step,
        data: {
          ...(step.data || {}),
          key: step.key,
        },
        disableBeacon: true,
        placement: step.mobilePlacement && isMobileViewport ? step.mobilePlacement : step.placement,
        skipBeacon: true,
        target: createTourTargetResolver(step),
        zIndex: options.zIndex || TOUR_LAYER_Z_INDEX,
      }
    })
    .filter(Boolean)

export const waitForTourAnchors = async ({
  anchorSelectors,
  buildSteps,
  moduleSelector,
  timeoutMs,
}) =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([])
      return
    }

    const startedAt = Date.now()
    const tick = () => {
      const hasModule = Boolean(getVisibleElement(moduleSelector))
      const hasAnyTourTarget = anchorSelectors.some((target) => getVisibleElement(target))
      const steps = buildSteps()
      if (hasModule && hasAnyTourTarget && steps.length > 0) {
        resolve(steps)
        return
      }
      if (Date.now() - startedAt >= timeoutMs) {
        resolve(steps)
        return
      }
      window.setTimeout(tick, 100)
    }

    tick()
  })

export const getEffectiveSuppressionRecord = (serverRecord, fallbackRecord, isSuppressed) => {
  if (isSuppressed(serverRecord)) return serverRecord
  if (isSuppressed(fallbackRecord)) return fallbackRecord
  return serverRecord || fallbackRecord
}
