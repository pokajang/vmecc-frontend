import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { ACTIONS, EVENTS, STATUS } from 'react-joyride'

import { useGuardedNavigate } from 'src/contexts/NavigationGuardContext'
import {
  TOUR_LAYER_Z_INDEX,
  TOUR_READY_NOTICE_DELAY_MS,
  buildVisibleTourSteps,
  getEffectiveSuppressionRecord,
  getOnboardingTargetElement,
  getVisibleElement,
  waitForNextFrame,
  waitForTourAnchors,
} from 'src/onboarding/tourRuntime'
import {
  logOnboardingDebug,
  readOnboardingState,
  updateOnboardingEvent,
} from 'src/onboarding/onboardingState'
import {
  ONBOARDING_TELEMETRY_EVENTS,
  trackOnboardingTelemetry,
} from 'src/onboarding/onboardingTelemetry'

const defaultRoutePattern = (route) => new RegExp(`^${route.replace(/\//g, '\\/')}\\/?$`, 'i')

const toSource = (config, name, fallback) => config.sourceDefaults?.[name] || fallback
const normalizeStepKey = (value) => String(value || '').trim()
const isDisabledElement = (element) =>
  Boolean(
    element &&
      ((typeof element.disabled === 'boolean' && element.disabled) ||
        element.getAttribute?.('aria-disabled') === 'true'),
  )

const waitForActionableTourTarget = async (
  selector,
  { allowOffscreen = false, timeoutMs = 1500 } = {},
) => {
  const normalizedSelector = String(selector || '').trim()
  if (!normalizedSelector || typeof window === 'undefined') return null

  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const candidate = getOnboardingTargetElement(normalizedSelector, { allowOffscreen })
    if (candidate && !isDisabledElement(candidate)) {
      return candidate
    }

    await waitForNextFrame()
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  }

  const candidate = getOnboardingTargetElement(normalizedSelector, { allowOffscreen })
  return candidate && !isDisabledElement(candidate) ? candidate : null
}

const sliceStepsFromKey = (visibleSteps, startAtStepKey) => {
  const normalizedStepKey = normalizeStepKey(startAtStepKey)
  if (!normalizedStepKey) return visibleSteps
  const startIndex = visibleSteps.findIndex((step) => step.key === normalizedStepKey)
  return startIndex >= 0 ? visibleSteps.slice(startIndex) : []
}

export const useOnboardingTourRunner = (config, { locale = 'en', isValidConfig = true } = {}) => {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.authUser)
  const location = useLocation()
  const guardedNavigate = useGuardedNavigate()
  const promptDefaultSource = toSource(config, 'prompt', 'prompt')
  const moduleId = config.moduleId || config.id || config.key
  const currentUserKey = `${config.key}:${config.version}:${authUser?.id || 'anonymous'}`
  const [run, setRun] = useState(false)
  const [steps, setSteps] = useState([])
  const [tourRunId, setTourRunId] = useState(0)
  const [activeTourUserKey, setActiveTourUserKey] = useState(null)
  const [tourStateUserKey, setTourStateUserKey] = useState(null)
  const [starting, setStarting] = useState(false)
  const [showPreparing, setShowPreparing] = useState(false)
  const [notReady, setNotReady] = useState(false)
  const [localSuppression, setLocalSuppression] = useState({ suppressed: false, userKey: null })
  const [queuedLaunch, setQueuedLaunch] = useState(null)
  const [targetNotFoundStepKeys, setTargetNotFoundStepKeys] = useState([])
  const [tourSource, setTourSource] = useState(promptDefaultSource)
  const [, setStorageVersion] = useState(0)
  const preparingTimerRef = useRef(null)
  const startRequestIdRef = useRef(0)
  const currentUserKeyRef = useRef(currentUserKey)
  const tourEndedRef = useRef(false)
  const promptTelemetryKeyRef = useRef(null)

  const routePattern = useMemo(
    () => config.routePattern || defaultRoutePattern(config.route),
    [config.route, config.routePattern],
  )
  const promptRoutePattern = useMemo(
    () => config.promptRoutePattern || routePattern,
    [config.promptRoutePattern, routePattern],
  )
  const replayRoutePattern = useMemo(
    () => config.replayRoutePattern || routePattern,
    [config.replayRoutePattern, routePattern],
  )
  const launchEligibility = useMemo(
    () => (config.canLaunch || config.eligibility)(authUser),
    [authUser, config],
  )
  const autoPromptEligibility = useMemo(
    () => (config.canAutoPrompt ? config.canAutoPrompt(authUser) : launchEligibility),
    [authUser, config, launchEligibility],
  )
  const serverOnboardingRecord = readOnboardingState(authUser, config.key, config.version)
  const fallbackOnboardingRecord = config.readFallbackRecord?.(authUser?.id) || null
  const storageRecord = getEffectiveSuppressionRecord(
    serverOnboardingRecord,
    fallbackOnboardingRecord,
    config.suppression,
  )
  const isTourRoute = routePattern.test(location.pathname)
  const isPromptRoute = promptRoutePattern.test(location.pathname)
  const isSuppressed = config.suppression(storageRecord)
  const isUiStateForCurrentUser = tourStateUserKey === currentUserKey
  const runForCurrentUser = run && activeTourUserKey === currentUserKey
  const startingForCurrentUser = starting && isUiStateForCurrentUser
  const locallySuppressed =
    localSuppression.userKey === currentUserKey && localSuppression.suppressed
  const queuedLaunchPendingForRoute =
    queuedLaunch?.userKey === currentUserKey && routePattern.test(location.pathname)
  const promptVisible =
    (isPromptRoute &&
      autoPromptEligibility.eligible &&
      !queuedLaunchPendingForRoute &&
      !isSuppressed &&
      !locallySuppressed &&
      !runForCurrentUser &&
      !startingForCurrentUser) ||
    (isPromptRoute && isUiStateForCurrentUser && (showPreparing || notReady))

  const clearPreparingTimer = useCallback(() => {
    if (preparingTimerRef.current) {
      window.clearTimeout(preparingTimerRef.current)
      preparingTimerRef.current = null
    }
  }, [])

  const clearQueuedLaunch = useCallback(() => {
    setQueuedLaunch(null)
  }, [])

  useEffect(
    () => () => {
      clearPreparingTimer()
    },
    [clearPreparingTimer],
  )

  useEffect(() => {
    currentUserKeyRef.current = currentUserKey
    startRequestIdRef.current += 1
    tourEndedRef.current = false
    clearPreparingTimer()
  }, [clearPreparingTimer, currentUserKey])

  const buildSteps = useCallback(
    () =>
      buildVisibleTourSteps(config.steps, {
        pathname: location.pathname,
        zIndex: TOUR_LAYER_Z_INDEX,
      }),
    [config.steps, location.pathname],
  )

  const persistTourEvent = useCallback(
    async ({ event, fallbackRecord, payload = {}, syncRedux = true }) => {
      const nextState = await updateOnboardingEvent({
        dispatch,
        event,
        fallbackRecord,
        key: config.key,
        payload,
        syncRedux,
        user: authUser,
        version: config.version,
        writeFallbackRecord: config.writeFallbackRecord,
      })
      if (!nextState && fallbackRecord) {
        setStorageVersion((version) => version + 1)
      }
      return nextState
    },
    [authUser, config.key, config.version, config.writeFallbackRecord, dispatch],
  )

  const queueContinuation = useCallback(
    ({
      bypassSuppression = true,
      requireAutoPromptEligibility = false,
      route = '',
      source = tourSource,
      startAtStepKey = null,
      userId = authUser?.id || null,
      allowOffscreenWaitTarget = false,
      waitForSelector = '',
    } = {}) => {
      const nextRoute = String(route || '').trim()
      const nextWaitForSelector = String(waitForSelector || '').trim()

      setRun(false)
      setSteps([])
      setStarting(false)
      setShowPreparing(false)
      setNotReady(false)
      setQueuedLaunch({
        bypassSuppression,
        requireAutoPromptEligibility,
        source,
        startAtStepKey: normalizeStepKey(startAtStepKey) || null,
        userId,
        userKey: currentUserKey,
        allowOffscreenWaitTarget: Boolean(allowOffscreenWaitTarget),
        waitForSelector: nextWaitForSelector || null,
      })

      if (nextRoute && nextRoute !== location.pathname) {
        guardedNavigate(nextRoute)
      }
    },
    [authUser?.id, currentUserKey, guardedNavigate, location.pathname, tourSource],
  )

  const handleStepPrimaryAction = useCallback(
    async (step) => {
      if (!step) return

      const nextRoute = String(step.primaryActionRoute || '').trim()
      const nextStartAtStepKey = normalizeStepKey(step.primaryActionStartAtStepKey) || null
      const nextWaitForSelector = String(step.primaryActionWaitForSelector || '').trim()
      const actionSelector = String(step.primaryActionTargetSelector || '').trim()
      const allowOffscreenTarget = Boolean(step.allowOffscreenTarget)
      const actionTarget = actionSelector
        ? await waitForActionableTourTarget(actionSelector, {
            allowOffscreen: allowOffscreenTarget,
          })
        : null
      let actionPerformed = false

      if (actionSelector && !actionTarget) {
        return
      }

      if (actionTarget && typeof actionTarget.click === 'function') {
        actionTarget.click()
        actionPerformed = true
      }

      if (!nextRoute && !actionPerformed && nextWaitForSelector) {
        return
      }

      queueContinuation({
        route: nextRoute,
        source: tourSource,
        startAtStepKey: nextStartAtStepKey,
        userId: authUser?.id || null,
        allowOffscreenWaitTarget: allowOffscreenTarget,
        waitForSelector: nextWaitForSelector,
      })
    },
    [authUser?.id, queueContinuation, tourSource],
  )

  const attachStepActions = useCallback(
    (visibleSteps) =>
      visibleSteps.map((step, index) => {
        if (!step.primaryActionLabel || index !== visibleSteps.length - 1) return step

        return {
          ...step,
          onPrimaryAction: () => handleStepPrimaryAction(step),
        }
      }),
    [handleStepPrimaryAction],
  )

  const performTourStart = useCallback(
    async ({
      bypassSuppression = false,
      requireAutoPromptEligibility = false,
      source = toSource(config, 'prompt', 'prompt'),
      startAtStepKey = null,
      userId = null,
    } = {}) => {
      const latestRecord = getEffectiveSuppressionRecord(
        readOnboardingState(authUser, config.key, config.version),
        config.readFallbackRecord?.(authUser?.id) || null,
        config.suppression,
      )

      if (
        !authUser?.id ||
        (userId && String(userId) !== String(authUser.id)) ||
        !launchEligibility.eligible ||
        (requireAutoPromptEligibility && !autoPromptEligibility.eligible) ||
        (!bypassSuppression && config.suppression(latestRecord))
      ) {
        logOnboardingDebug('start ignored', {
          autoPromptEligible: autoPromptEligibility.eligible,
          eligible: launchEligibility.eligible,
          key: config.key,
          moduleId,
          reason: 'guard',
          source,
          userId,
        })
        return
      }

      clearQueuedLaunch()
      clearPreparingTimer()
      const startRequestId = startRequestIdRef.current + 1
      startRequestIdRef.current = startRequestId
      const startUserKey = currentUserKey
      const normalizedStartAtStepKey = normalizeStepKey(startAtStepKey)
      setStarting(true)
      setShowPreparing(false)
      setNotReady(false)
      setActiveTourUserKey(startUserKey)
      setTourStateUserKey(startUserKey)
      setLocalSuppression({ suppressed: false, userKey: startUserKey })
      setTargetNotFoundStepKeys([])
      setTourSource(source)
      tourEndedRef.current = false
      trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.tourStarted, {
        locale,
        moduleId,
        source,
        tourKey: config.key,
      })
      preparingTimerRef.current = window.setTimeout(() => {
        setShowPreparing(true)
      }, TOUR_READY_NOTICE_DELAY_MS)

      const startedAt = new Date().toISOString()
      void persistTourEvent({
        event: 'started',
        fallbackRecord: {
          lastStartedAt: startedAt,
          payload: {
            lastRunAt: startedAt,
            moduleId,
            source,
            startAtStepKey: normalizedStartAtStepKey || null,
          },
        },
        payload: {
          lastRunAt: startedAt,
          moduleId,
          source,
          startAtStepKey: normalizedStartAtStepKey || null,
        },
        syncRedux: false,
      })

      await waitForNextFrame()
      const resolvedSteps = await waitForTourAnchors({
        anchorSelectors: config.selectors.anchors,
        buildSteps,
        moduleSelector: config.selectors.module,
        timeoutMs: config.anchorTimeoutMs,
      })
      const nextSteps = sliceStepsFromKey(resolvedSteps, normalizedStartAtStepKey)
      await waitForNextFrame()
      if (
        startRequestId !== startRequestIdRef.current ||
        startUserKey !== currentUserKeyRef.current
      ) {
        logOnboardingDebug('start cancelled', { key: config.key, moduleId, source })
        return
      }
      clearPreparingTimer()

      if (nextSteps.length === 0) {
        logOnboardingDebug('targets not ready', { key: config.key, moduleId, source })
        setStarting(false)
        setShowPreparing(false)
        setNotReady(true)
        return
      }

      logOnboardingDebug('starting tour', {
        key: config.key,
        moduleId,
        source,
        startAtStepKey: normalizedStartAtStepKey || null,
        stepKeys: nextSteps.map((step) => step.key),
      })
      const preparedSteps = attachStepActions(nextSteps)
      setRun(false)
      setSteps(preparedSteps)
      setTourRunId((current) => current + 1)
      setStarting(false)
      setShowPreparing(false)
      await waitForNextFrame()
      setRun(true)
    },
    [
      authUser,
      autoPromptEligibility.eligible,
      buildSteps,
      clearPreparingTimer,
      clearQueuedLaunch,
      config,
      currentUserKey,
      launchEligibility.eligible,
      locale,
      moduleId,
      attachStepActions,
      persistTourEvent,
    ],
  )

  const startTour = useCallback(
    ({
      bypassSuppression = false,
      navigateToRoute = false,
      requireAutoPromptEligibility = false,
      source = toSource(config, 'prompt', 'prompt'),
      userId = null,
    } = {}) => {
      if (navigateToRoute && !replayRoutePattern.test(location.pathname)) {
        setQueuedLaunch({
          bypassSuppression,
          requireAutoPromptEligibility,
          source,
          userId,
          userKey: currentUserKey,
        })
        logOnboardingDebug('queue launch', {
          key: config.key,
          moduleId,
          route: config.route,
          source,
        })
        guardedNavigate(config.route)
        return
      }

      void performTourStart({
        bypassSuppression,
        requireAutoPromptEligibility,
        source,
        userId,
      })
    },
    [
      config,
      currentUserKey,
      guardedNavigate,
      location.pathname,
      moduleId,
      performTourStart,
      replayRoutePattern,
    ],
  )

  const dismissTour = useCallback(
    async ({ reason = 'skip' } = {}) => {
      clearQueuedLaunch()
      clearPreparingTimer()
      if (tourEndedRef.current && run) return
      tourEndedRef.current = true
      setStarting(false)
      setRun(false)
      setSteps([])
      setShowPreparing(false)
      setNotReady(false)
      setLocalSuppression({ suppressed: true, userKey: currentUserKey })
      trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.tourDismissed, {
        locale,
        moduleId,
        reason,
        source: tourSource,
        tourKey: config.key,
      })
      logOnboardingDebug('dismiss tour', {
        key: config.key,
        moduleId,
        reason,
        source: tourSource,
      })
      await persistTourEvent({
        event: 'dismissed',
        fallbackRecord: { dismissedAt: new Date().toISOString(), payload: { moduleId, reason } },
        payload: { moduleId, reason, source: tourSource },
      })
    },
    [
      clearPreparingTimer,
      clearQueuedLaunch,
      config.key,
      currentUserKey,
      locale,
      moduleId,
      persistTourEvent,
      run,
      tourSource,
    ],
  )

  const completeTour = useCallback(
    async ({ lastStepKey = null } = {}) => {
      clearQueuedLaunch()
      clearPreparingTimer()
      if (tourEndedRef.current) return
      tourEndedRef.current = true
      setStarting(false)
      setRun(false)
      setSteps([])
      setShowPreparing(false)
      setNotReady(false)
      setLocalSuppression({ suppressed: true, userKey: currentUserKey })
      trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.tourCompleted, {
        detail: { lastStepKey, targetNotFoundStepKeys },
        locale,
        moduleId,
        source: tourSource,
        stepKey: lastStepKey,
        tourKey: config.key,
      })
      logOnboardingDebug('complete tour', {
        key: config.key,
        lastStepKey,
        moduleId,
        source: tourSource,
      })
      await persistTourEvent({
        event: 'completed',
        fallbackRecord: {
          completedAt: new Date().toISOString(),
          payload: { completedFrom: tourSource, moduleId },
        },
        payload: {
          completedFrom: tourSource,
          lastStepKey,
          moduleId,
          targetNotFoundStepKeys,
        },
      })
    },
    [
      clearPreparingTimer,
      clearQueuedLaunch,
      config.key,
      currentUserKey,
      locale,
      moduleId,
      persistTourEvent,
      targetNotFoundStepKeys,
      tourSource,
    ],
  )

  useEffect(() => {
    if (!queuedLaunch) return
    if (queuedLaunch.userKey !== currentUserKey) return
    if (!routePattern.test(location.pathname)) return

    const resumeLaunch = () => {
      const waitForSelector = String(queuedLaunch.waitForSelector || '').trim()
      if (
        waitForSelector &&
        !getOnboardingTargetElement(waitForSelector, {
          allowOffscreen: Boolean(queuedLaunch.allowOffscreenWaitTarget),
        })
      ) {
        return false
      }

      void performTourStart(queuedLaunch)
      return true
    }

    if (resumeLaunch()) {
      return undefined
    }

    const resumeTimer = window.setInterval(() => {
      if (resumeLaunch()) {
        window.clearInterval(resumeTimer)
      }
    }, 150)

    return () => window.clearInterval(resumeTimer)
  }, [currentUserKey, location.pathname, performTourStart, queuedLaunch, routePattern])

  useEffect(() => {
    const handleRequest = (event) => {
      startTour({
        navigateToRoute: true,
        requireAutoPromptEligibility: false,
        source: event?.detail?.source || toSource(config, 'request', 'request'),
        userId: event?.detail?.userId || null,
      })
    }
    window.addEventListener(config.requestEvent, handleRequest)
    return () => window.removeEventListener(config.requestEvent, handleRequest)
  }, [config, startTour])

  useEffect(() => {
    const handleReplayRequest = (event) => {
      startTour({
        bypassSuppression: true,
        navigateToRoute: true,
        requireAutoPromptEligibility: false,
        source: event?.detail?.source || toSource(config, 'replay', 'replay'),
        userId: event?.detail?.userId || null,
      })
    }
    window.addEventListener(config.replayEvent, handleReplayRequest)
    return () => window.removeEventListener(config.replayEvent, handleReplayRequest)
  }, [config, startTour])

  const handleJoyrideEvent = useCallback(
    (data) => {
      const { action, index, status, type } = data
      const currentStepKey = steps[index]?.key || steps[index]?.data?.key || null

      logOnboardingDebug('joyride event', {
        action,
        key: config.key,
        moduleId,
        source: tourSource,
        status,
        stepKey: currentStepKey,
        type,
      })

      if (type === EVENTS.TOOLTIP) return

      if (status === STATUS.FINISHED) {
        completeTour({ lastStepKey: currentStepKey || steps[steps.length - 1]?.key || null })
        return
      }

      if (status === STATUS.SKIPPED) {
        dismissTour({ reason: 'skip' })
        return
      }

      if (action === ACTIONS.CLOSE) {
        dismissTour({ reason: 'close' })
        return
      }

      if (type === EVENTS.TARGET_NOT_FOUND && currentStepKey) {
        const nextTargetNotFoundStepKeys = targetNotFoundStepKeys.includes(currentStepKey)
          ? targetNotFoundStepKeys
          : [...targetNotFoundStepKeys, currentStepKey]

        setTargetNotFoundStepKeys(nextTargetNotFoundStepKeys)
        trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.targetNotFound, {
          detail: { targetNotFoundStepKeys: nextTargetNotFoundStepKeys },
          locale,
          moduleId,
          source: tourSource,
          stepKey: currentStepKey,
          tourKey: config.key,
        })
        void persistTourEvent({
          event: 'started',
          fallbackRecord: {
            lastStartedAt: new Date().toISOString(),
            payload: { moduleId, targetNotFoundStepKeys: nextTargetNotFoundStepKeys },
          },
          payload: { moduleId, targetNotFoundStepKeys: nextTargetNotFoundStepKeys },
          syncRedux: false,
        })
      }

      if (
        (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) &&
        action === ACTIONS.NEXT &&
        index >= steps.length - 1
      ) {
        completeTour({ lastStepKey: currentStepKey || steps[steps.length - 1]?.key || null })
      }
    },
    [
      completeTour,
      config.key,
      dismissTour,
      locale,
      moduleId,
      persistTourEvent,
      steps,
      targetNotFoundStepKeys,
      tourSource,
    ],
  )

  useEffect(() => {
    if (!isValidConfig || !promptVisible) {
      promptTelemetryKeyRef.current = null
      return
    }

    const promptState = showPreparing ? 'preparing' : notReady ? 'not_ready' : 'ready'
    const nextKey = `${currentUserKey}:${tourSource}:${promptState}`

    if (promptTelemetryKeyRef.current === nextKey) {
      return
    }

    promptTelemetryKeyRef.current = nextKey
    trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.promptShown, {
      locale,
      moduleId,
      promptState,
      source: tourSource,
      tourKey: config.key,
    })
  }, [
    config.key,
    currentUserKey,
    isValidConfig,
    locale,
    moduleId,
    notReady,
    promptVisible,
    showPreparing,
    tourSource,
  ])

  return {
    authUser,
    completeTour,
    dismissTour,
    eligibility: launchEligibility,
    handleJoyrideEvent,
    isSuppressed,
    isTourRoute,
    promptVisible,
    notReady: isUiStateForCurrentUser && notReady,
    run: runForCurrentUser,
    showPreparing: isUiStateForCurrentUser && showPreparing,
    startTour,
    steps: runForCurrentUser ? steps : [],
    tourRunId,
    tourSource,
  }
}
