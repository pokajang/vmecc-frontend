import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { logError } from 'src/services/logger'
import { extractFireExtinguisherSerial } from './locator'
import { fetchFireExtinguisherOptions } from '../../domain/api/inspectionFireExtinguisherApi'
import {
  buildScannerDiagnostics,
  classifyScannerFailure,
  getCameraPermissionState,
  getScannerFailureContent,
  getStreamDeviceDetails,
  inspectScannerEnvironment,
  SCANNER_FAILURE_TYPES,
  selectPreferredVideoDevice,
  stopMediaStream,
} from './scannerSupport'

const text = (value) => String(value || '').trim()
const SCAN_TIMEOUT_MS = 4000
const SCAN_CONFIRMATION_WINDOW_MS = 2500
const DECODE_DIAGNOSTIC_TEXT_LIMIT = 96
const SCAN_INVALID_HINT_THRESHOLD = 3
const SCAN_INVALID_HINT_WINDOW_MS = 12000
const MANUAL_SERIAL_SUGGESTION_LIMIT = 8
const MIN_MANUAL_SERIAL_QUERY_LENGTH = 2
const MANUAL_SERIAL_SEARCH_DEBOUNCE_MS = 250
const SCAN_UNSUCCESSFUL_HINT = 'QR code unsuccessful. Enter the code below.'
const SCANNER_TITLE = 'Search FE by Serial Number'
const SCANNER_FORMATS = [
  BarcodeFormat?.QR_CODE,
  BarcodeFormat?.CODE_128,
  BarcodeFormat?.CODE_39,
].filter((format) => format !== undefined && format !== null)

const CAMERA_START_ATTEMPTS = [
  {
    label: 'rear_1280x720',
    constraints: {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
  },
  {
    label: 'rear',
    constraints: {
      video: {
        facingMode: { ideal: 'environment' },
      },
      audio: false,
    },
  },
  {
    label: 'any_camera',
    constraints: {
      video: true,
      audio: false,
    },
  },
]

const TERMINAL_STARTUP_FAILURES = new Set([
  SCANNER_FAILURE_TYPES.INSECURE_CONTEXT,
  SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER,
  SCANNER_FAILURE_TYPES.PERMISSION_DENIED_SESSION,
  SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED,
  SCANNER_FAILURE_TYPES.POLICY_BLOCKED,
])

const isPreflightFailure = (failureType) =>
  [
    SCANNER_FAILURE_TYPES.INSECURE_CONTEXT,
    SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER,
    SCANNER_FAILURE_TYPES.POLICY_BLOCKED,
  ].includes(failureType)

const createScannerReader = () => {
  const reader = new BrowserMultiFormatReader()
  if (SCANNER_FORMATS.length > 0) {
    reader.possibleFormats = SCANNER_FORMATS
  }
  return reader
}

const truncateDiagnosticText = (value) => {
  const normalized = text(value).replace(/\s+/g, ' ')
  if (normalized.length <= DECODE_DIAGNOSTIC_TEXT_LIMIT) return normalized
  return `${normalized.slice(0, DECODE_DIAGNOSTIC_TEXT_LIMIT)}...`
}

const getDecodedText = (result) => result?.getText?.() || String(result || '')

const getDecodedFormat = (result) => {
  const format = result?.getBarcodeFormat?.()
  if (typeof format === 'number') return BarcodeFormat?.[format] || String(format)
  return text(format)
}

const digitsOnly = (value) => text(value).replace(/\D+/g, '')

const buildSerialOptionLabel = ({ serial, feType, locationCode, baseLabel }) => {
  const normalizedSerial = text(serial)
  const normalizedType = text(feType)
  const normalizedLocationCode = text(locationCode)
  const normalizedLabel = text(baseLabel)
  const descriptor = [normalizedType, normalizedLocationCode].filter(Boolean).join(' - ')

  if (descriptor) {
    return `${normalizedSerial} - ${descriptor}`
  }

  if (!normalizedLabel || normalizedLabel === normalizedSerial) return normalizedSerial
  if (normalizedLabel.toUpperCase().includes(normalizedSerial.toUpperCase())) return normalizedLabel

  return `${normalizedSerial} - ${normalizedLabel}`
}

const getManualOptionMatchRank = (option, query) => {
  const normalizedQuery = text(query).toUpperCase()
  if (!normalizedQuery) return Number.MAX_SAFE_INTEGER

  const serial = text(option?.value).toUpperCase()
  const label = text(option?.label).toUpperCase()
  const locationCode = text(option?.locationCode).toUpperCase()
  const serialDigits = digitsOnly(serial)
  const queryDigits = digitsOnly(normalizedQuery)
  const isNumericQuery = queryDigits.length > 0 && queryDigits === normalizedQuery

  if (locationCode && locationCode === normalizedQuery) return 0
  if (locationCode && locationCode.startsWith(normalizedQuery)) return 1
  if (serial === normalizedQuery) return 2
  if (serial.startsWith(normalizedQuery)) return 3

  if (isNumericQuery) {
    if (serialDigits === queryDigits) return 4
    if (serialDigits.endsWith(queryDigits)) return 5
    if (serialDigits.includes(queryDigits)) return 6
  }

  if (label.includes(normalizedQuery)) return 7
  return Number.MAX_SAFE_INTEGER
}

const normalizeSerialOption = (option = {}) => {
  const serialInput =
    option?.serial ||
    option?.barcodeNo ||
    option?.value ||
    option?.locator ||
    (typeof option === 'string' ? option : '')
  const serial = extractFireExtinguisherSerial(serialInput)
  if (!serial) return null

  const baseLabel = text(
    option?.label ||
      option?.name ||
      option?.title ||
      option?.idLocNo ||
      option?.barcodeNo ||
      serial,
  )

  const feType = text(option?.feType || option?.fe_type || '')
  const locationCode = text(option?.idLocNo || option?.unitNo || option?.unit_no || '')

  return {
    value: serial,
    label: buildSerialOptionLabel({ serial, feType, locationCode, baseLabel }),
    locationCode,
    searchText: `${serial} ${feType} ${locationCode} ${baseLabel}`.toUpperCase(),
  }
}

const findExactManualOptionMatches = (options = [], rawQuery = '') => {
  const normalizedQuery = text(rawQuery).toUpperCase()
  const normalizedSerial = extractFireExtinguisherSerial(rawQuery)

  if (!normalizedQuery && !normalizedSerial) return []

  return (Array.isArray(options) ? options : []).filter((option) => {
    const serial = text(option?.value).toUpperCase()
    const locationCode = text(option?.locationCode).toUpperCase()

    if (!serial) return false

    return (
      serial === normalizedQuery ||
      (normalizedSerial && serial === normalizedSerial) ||
      (locationCode && locationCode === normalizedQuery)
    )
  })
}

const resolveManualSerialOption = ({
  rawValue = '',
  availableOptions = [],
  visibleOptions = [],
  isLoading = false,
}) => {
  const normalizedQuery = text(rawValue).toUpperCase()
  if (!normalizedQuery) {
    return {
      option: null,
      error: 'Enter a stored FE serial number or unit number.',
    }
  }

  if (visibleOptions.length === 1) {
    return {
      option: visibleOptions[0],
      error: '',
    }
  }

  const exactMatches = findExactManualOptionMatches(availableOptions, normalizedQuery)
  if (exactMatches.length === 1) {
    return {
      option: exactMatches[0],
      error: '',
    }
  }

  if (normalizedQuery.length < MIN_MANUAL_SERIAL_QUERY_LENGTH) {
    return {
      option: null,
      error: 'Type at least 2 characters to search stored S/N values.',
    }
  }

  if (isLoading) {
    return {
      option: null,
      error: 'Waiting for stored S/N results to finish loading.',
    }
  }

  if (visibleOptions.length === 0) {
    return {
      option: null,
      error: 'No matching stored S/N values found.',
    }
  }

  return {
    option: null,
    error: 'Select a stored FE from the list.',
  }
}

const isManualSearchScopeEmpty = (scope = {}) =>
  !text(scope?.zone) && !text(scope?.mainLocation) && !text(scope?.subLocation)

const buildManualSearchScopes = (scope = {}) => {
  const normalizedScope = {
    zone: text(scope?.zone),
    mainLocation: text(scope?.mainLocation),
    subLocation: text(scope?.subLocation),
  }

  if (isManualSearchScopeEmpty(normalizedScope)) return [normalizedScope]

  return [
    normalizedScope,
    {
      zone: '',
      mainLocation: '',
      subLocation: '',
    },
  ]
}

const mergeManualSearchOptions = (groups = []) => {
  const seen = new Set()
  return groups.flat().filter((option) => {
    const serial = text(option?.value)
    if (!serial || seen.has(serial)) return false
    seen.add(serial)
    return true
  })
}

const FireExtinguisherScanner = ({
  isChecking = false,
  visible = false,
  onClose,
  onScan,
  fireExtinguisherSerialOptions = [],
  fireExtinguisherSerialSearchScope = null,
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const videoRef = useRef(null)
  const manualInputRef = useRef(null)
  const controlsRef = useRef(null)
  const streamRef = useRef(null)
  const onScanRef = useRef(onScan)
  const sessionRef = useRef(0)
  const scannedRef = useRef(false)
  const pendingScanRef = useRef(null)
  const lastDecodeDiagnosticsRef = useRef(null)
  const timeoutRef = useRef(null)
  const failureLoggedRef = useRef(false)
  const manualSearchRequestRef = useRef(0)
  const scanInvalidStateRef = useRef({
    count: 0,
    windowStart: 0,
  })
  const suppressSuggestionClickRef = useRef(false)
  const suppressSuggestionClickTimerRef = useRef(0)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')
  const [scanHint, setScanHint] = useState('')
  const [manualFallbackActive, setManualFallbackActive] = useState(false)
  const [phase, setPhase] = useState('ready')
  const [failure, setFailure] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [manualSearchOptions, setManualSearchOptions] = useState([])
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false)
  const [manualSearchError, setManualSearchError] = useState('')
  const manualSearchScope = useMemo(
    () => ({
      zone: text(fireExtinguisherSerialSearchScope?.zone || ''),
      mainLocation: text(fireExtinguisherSerialSearchScope?.mainLocation || ''),
      subLocation: text(fireExtinguisherSerialSearchScope?.subLocation || ''),
    }),
    [fireExtinguisherSerialSearchScope],
  )
  const manualSearchKey = useMemo(
    () =>
      `${manualSearchScope.zone}|${manualSearchScope.mainLocation}|${manualSearchScope.subLocation}`.trim(),
    [manualSearchScope],
  )
  const manualSearchQuery = useMemo(() => text(manualValue).toUpperCase().trim(), [manualValue])
  const serialOptions = useMemo(
    () =>
      (Array.isArray(fireExtinguisherSerialOptions) ? fireExtinguisherSerialOptions : [])
        .map(normalizeSerialOption)
        .filter(Boolean),
    [fireExtinguisherSerialOptions],
  )
  const availableSerialOptions = useMemo(() => {
    const seen = new Set()
    const options = [...serialOptions, ...manualSearchOptions]
    return options.filter((option) => {
      if (seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
  }, [manualSearchOptions, serialOptions])

  const manualSerialOptions = useMemo(() => {
    if (!manualSearchQuery) {
      return []
    }

    if (manualSearchQuery.length < MIN_MANUAL_SERIAL_QUERY_LENGTH) {
      return []
    }

    return availableSerialOptions
      .map((option, index) => ({
        option,
        index,
        rank: getManualOptionMatchRank(option, manualSearchQuery),
      }))
      .filter(
        ({ rank, option }) =>
          rank !== Number.MAX_SAFE_INTEGER || option.searchText.includes(manualSearchQuery),
      )
      .sort((left, right) => {
        if (left.rank !== right.rank) return left.rank - right.rank
        return left.index - right.index
      })
      .map(({ option }) => option)
      .slice(0, MANUAL_SERIAL_SUGGESTION_LIMIT)
  }, [availableSerialOptions, manualSearchQuery])

  useEffect(() => {
    if (!visible) {
      setManualSearchOptions([])
      setIsManualSearchLoading(false)
      setManualSearchError('')
      return
    }

    if (!manualSearchQuery || manualSearchQuery.length < MIN_MANUAL_SERIAL_QUERY_LENGTH) {
      setManualSearchOptions([])
      setIsManualSearchLoading(false)
      setManualSearchError('')
      return
    }

    const requestId = ++manualSearchRequestRef.current
    const timer = window.setTimeout(async () => {
      setIsManualSearchLoading(true)
      try {
        const searchScopes = buildManualSearchScopes(manualSearchScope)
        let resolvedOptions = []

        for (const searchScope of searchScopes) {
          const { data } = await fetchFireExtinguisherOptions({
            zone: searchScope.zone,
            mainLocation: searchScope.mainLocation,
            subLocation: searchScope.subLocation,
            search: manualSearchQuery,
          })
          if (!visible || requestId !== manualSearchRequestRef.current) return

          const nextOptions = (Array.isArray(data) ? data : [])
            .map(normalizeSerialOption)
            .filter(Boolean)

          resolvedOptions = mergeManualSearchOptions([resolvedOptions, nextOptions])
          if (resolvedOptions.length > 0) break
        }

        if (!visible || requestId !== manualSearchRequestRef.current) return

        setManualSearchOptions(resolvedOptions)
        setManualSearchError('')
      } catch {
        if (!visible || requestId !== manualSearchRequestRef.current) return
        setManualSearchOptions([])
        setManualSearchError('Could not load stored FE IDs right now.')
      } finally {
        if (visible && requestId === manualSearchRequestRef.current) {
          setIsManualSearchLoading(false)
        }
      }
    }, MANUAL_SERIAL_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [manualSearchQuery, manualSearchKey, visible, manualSearchScope])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const clearActiveScanner = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    controlsRef.current?.stop?.()
    controlsRef.current = null
    stopMediaStream(streamRef.current)
    streamRef.current = null
    pendingScanRef.current = null
  }

  const resetInvalidScanState = () => {
    scanInvalidStateRef.current = { count: 0, windowStart: 0 }
    setManualFallbackActive(false)
  }

  const queueManualFallbackFocus = () => {
    const input = manualInputRef.current
    if (input) {
      window.setTimeout(() => input.focus(), 0)
    }
  }

  useEffect(() => {
    if (!visible) {
      sessionRef.current += 1
      clearActiveScanner()
      scannedRef.current = false
      failureLoggedRef.current = false
      resetInvalidScanState()
      setPhase('ready')
      setFailure(null)
      setDiagnostics(null)
      lastDecodeDiagnosticsRef.current = null
      setManualError('')
      setManualValue('')
      setManualSearchOptions([])
      setIsManualSearchLoading(false)
      setManualSearchError('')
      setScanHint('')
      return undefined
    }

    scannedRef.current = false
    failureLoggedRef.current = false
    resetInvalidScanState()
    setPhase('ready')
    setFailure(null)
    setDiagnostics(null)
    lastDecodeDiagnosticsRef.current = null
    setManualError('')
    setManualValue('')
    setManualSearchOptions([])
    setIsManualSearchLoading(false)
    setManualSearchError('')
    setScanHint('')

    return () => {
      sessionRef.current += 1
      clearActiveScanner()
    }
  }, [visible])

  useEffect(() => {
    if (manualFallbackActive) queueManualFallbackFocus()
  }, [manualFallbackActive])

  const handleScannerFailure = ({
    error,
    environment,
    failureType,
    nextPhase,
    selectedDevice,
    selectedConstraint,
  }) => {
    const resolvedFailureType =
      failureType || classifyScannerFailure({ environment, error, phase: nextPhase })
    const content = getScannerFailureContent(resolvedFailureType)
    const isScanUnsuccessful =
      resolvedFailureType === SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE
    const nextContent =
      isScanUnsuccessful && nextPhase !== 'image_decode'
        ? { ...content, message: SCAN_UNSUCCESSFUL_HINT }
        : content
    const nextDiagnostics = buildScannerDiagnostics({
      environment,
      error,
      failureType: resolvedFailureType,
      selectedDevice,
      phase: nextPhase,
      selectedConstraint,
    })
    const mergedDiagnostics = {
      ...nextDiagnostics,
      ...(lastDecodeDiagnosticsRef.current || {}),
    }

    clearActiveScanner()
    setPhase('error')
    setManualFallbackActive(isScanUnsuccessful)
    setFailure({
      type: resolvedFailureType,
      ...nextContent,
    })
    if (isScanUnsuccessful) {
      setScanHint(SCAN_UNSUCCESSFUL_HINT)
    }
    setDiagnostics(mergedDiagnostics)

    if (!failureLoggedRef.current) {
      failureLoggedRef.current = true
      logError(
        '[FireExtinguisherScanner] camera access failed',
        error || new Error(content.title),
        {
          ...nextDiagnostics,
          ...(lastDecodeDiagnosticsRef.current || {}),
        },
      )
    }
  }

  const updateDecodeDiagnostics = ({
    environment,
    result,
    rawValue,
    phase: decodePhase,
    rejectionReason,
  }) => {
    const decodeDiagnostics = {
      decodedFormat: getDecodedFormat(result),
      lastDecodedText: truncateDiagnosticText(rawValue),
      rejectionReason,
    }
    lastDecodeDiagnosticsRef.current = decodeDiagnostics
    setDiagnostics({
      ...buildScannerDiagnostics({
        environment,
        error: {
          name: 'InvalidScanResult',
          message: rejectionReason,
        },
        failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
        phase: decodePhase,
      }),
      ...decodeDiagnostics,
    })
  }

  const activateManualFallback = (options = {}) => {
    const {
      environment = {},
      result,
      rawValue,
      phase: decodePhase = 'scanning',
      rejectionReason = 'The scanner is not currently reading FE serials reliably.',
    } = options
    const fallbackContent = getScannerFailureContent(
      SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
    )
    const fallbackFailure = {
      ...fallbackContent,
      type: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
    }
    const nextDiagnostics = buildScannerDiagnostics({
      environment,
      error: {
        name: 'ScannerQualityFallback',
        message: rejectionReason,
      },
      failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
      phase: decodePhase,
    })

    clearActiveScanner()
    resetInvalidScanState()
    setManualFallbackActive(true)
    setPhase('error')
    setFailure(fallbackFailure)
    setScanHint(SCAN_UNSUCCESSFUL_HINT)
    setDiagnostics({
      ...nextDiagnostics,
      decodedFormat: getDecodedFormat(result),
      lastDecodedText: truncateDiagnosticText(rawValue),
      rejectionReason,
    })
  }

  const handleInvalidScanResult = ({
    environment,
    result,
    rawValue,
    phase: decodePhase = 'scanning',
  }) => {
    const now = Date.now()
    const state = scanInvalidStateRef.current
    const hasWindow = state.windowStart && now - state.windowStart <= SCAN_INVALID_HINT_WINDOW_MS
    const nextCount = hasWindow ? state.count + 1 : 1
    const nextWindowStart = hasWindow ? state.windowStart : now
    scanInvalidStateRef.current = {
      count: nextCount,
      windowStart: nextWindowStart,
    }

    const shouldFallback = nextCount >= SCAN_INVALID_HINT_THRESHOLD
    const rejectionReason = shouldFallback
      ? 'Scans were not recognized as valid FE serials multiple times.'
      : 'Decoded value is not a valid FE serial.'

    updateDecodeDiagnostics({
      environment,
      result,
      rawValue,
      phase: decodePhase,
      rejectionReason,
    })

    if (shouldFallback) {
      activateManualFallback({
        environment,
        result,
        rawValue,
        phase: decodePhase,
        rejectionReason,
      })
      return true
    }

    if (nextCount < SCAN_INVALID_HINT_THRESHOLD) {
      setScanHint('Detected a code, but it is not a valid FE serial.')
    }

    return false
  }

  const completeScan = (result, options = {}) => {
    const {
      environment = {},
      phase: decodePhase = 'scanning',
      requireConfirmation = true,
    } = options
    if (scannedRef.current) return false
    const rawValue = getDecodedText(result)
    const locator = extractFireExtinguisherSerial(rawValue)
    if (!locator) {
      pendingScanRef.current = null
      const didFallback = handleInvalidScanResult({
        environment,
        result,
        rawValue,
        phase: decodePhase,
      })
      if (didFallback) return false
      return false
    }

    if (requireConfirmation) {
      const now = Date.now()
      const pendingScan = pendingScanRef.current
      if (
        pendingScan?.locator !== locator ||
        now - Number(pendingScan?.seenAt || 0) > SCAN_CONFIRMATION_WINDOW_MS
      ) {
        pendingScanRef.current = { locator, seenAt: now }
        setScanHint('FE code detected. Hold steady to confirm scan.')
        updateDecodeDiagnostics({
          environment,
          result,
          rawValue,
          phase: decodePhase,
          rejectionReason: 'Waiting for a second matching FE serial decode.',
        })
        return false
      }
    }

    resetInvalidScanState()
    scannedRef.current = true
    setScanHint('')
    clearActiveScanner()
    onScanRef.current?.(locator)
    return true
  }

  const startCamera = async () => {
    if (isChecking || phase === 'preflight' || phase === 'requesting' || phase === 'scanning') {
      return
    }

    const session = sessionRef.current + 1
    sessionRef.current = session
    const isCurrentSession = () => visible && sessionRef.current === session
    let environment = null
    let selectedDevice = null
    let lastError = null
    let lastConstraint = ''

    clearActiveScanner()
    scannedRef.current = false
    failureLoggedRef.current = false
    setManualFallbackActive(false)
    setManualError('')
    setFailure(null)
    setDiagnostics(null)
    lastDecodeDiagnosticsRef.current = null
    resetInvalidScanState()
    setScanHint('')

    try {
      setPhase('preflight')
      environment = await inspectScannerEnvironment()
      if (!isCurrentSession()) return

      const preflightFailureType = classifyScannerFailure({
        environment,
        error: null,
        phase: 'preflight',
      })
      if (isPreflightFailure(preflightFailureType)) {
        handleScannerFailure({
          error: new Error('Scanner preflight failed.'),
          environment,
          failureType: preflightFailureType,
          nextPhase: 'preflight',
        })
        return
      }

      setPhase('requesting')
      for (const attempt of CAMERA_START_ATTEMPTS) {
        lastConstraint = attempt.label
        try {
          const stream = await navigator.mediaDevices.getUserMedia(attempt.constraints)
          if (!isCurrentSession()) {
            stopMediaStream(stream)
            return
          }

          streamRef.current = stream
          lastError = null
          break
        } catch (error) {
          lastError = error
          const failureType = classifyScannerFailure({
            environment,
            error,
            phase: 'requesting',
          })
          if (TERMINAL_STARTUP_FAILURES.has(failureType)) break
        }
      }

      if (!streamRef.current) {
        handleScannerFailure({
          error: lastError || new Error('Unable to start camera stream.'),
          environment,
          nextPhase: 'requesting',
          selectedConstraint: lastConstraint,
        })
        return
      }

      const reader = createScannerReader()
      const streamDevice = getStreamDeviceDetails(streamRef.current)
      environment = {
        ...environment,
        permissionState:
          environment.permissionState === 'granted' ? 'granted' : await getCameraPermissionState(),
      }

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      selectedDevice = selectPreferredVideoDevice(devices, streamDevice.deviceId) || streamDevice
      setPhase('scanning')

      const controls = await reader.decodeFromStream(
        streamRef.current,
        videoRef.current,
        (result) => {
          if (!result || !isCurrentSession()) return
          completeScan(result, {
            environment,
            phase: 'scanning',
            requireConfirmation: true,
          })
        },
      )

      if (!isCurrentSession() || scannedRef.current) {
        controls?.stop?.()
        return
      }

      controlsRef.current = controls
      timeoutRef.current = window.setTimeout(() => {
        if (!isCurrentSession() || scannedRef.current) return
        handleScannerFailure({
          error: {
            name: 'ScanTimeoutError',
            message: 'Timed out waiting for a readable QR or barcode.',
          },
          environment,
          failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
          nextPhase: 'scanning',
          selectedDevice,
          selectedConstraint: lastConstraint,
        })
      }, SCAN_TIMEOUT_MS)
    } catch (error) {
      if (!isCurrentSession()) return
      handleScannerFailure({
        error,
        environment: environment || (await inspectScannerEnvironment()),
        nextPhase: selectedDevice ? 'scanning' : 'requesting',
        selectedDevice,
        selectedConstraint: lastConstraint,
      })
    }
  }

  const submitManualValue = (nextValue = null) => {
    if (isChecking) return
    const { option, error } = resolveManualSerialOption({
      rawValue: nextValue ?? manualValue,
      availableOptions: availableSerialOptions,
      visibleOptions: manualSerialOptions,
      isLoading: isManualSearchLoading,
    })
    if (!option) {
      setManualError(error)
      return
    }
    setManualFallbackActive(false)
    setManualError('')
    setManualValue(option.value)
    onScan?.(option.value)
  }

  const handleManualValueSelect = (value) => {
    const selected = String(value || '').trim()
    if (!selected) return
    setManualValue(selected)
    setManualError('')
    submitManualValue(selected)
  }

  const clearSuggestionClickSuppression = () => {
    window.clearTimeout(suppressSuggestionClickTimerRef.current)
    suppressSuggestionClickTimerRef.current = 0
    suppressSuggestionClickRef.current = false
  }

  const activateManualSuggestion = (value) => (event) => {
    const eventType = event?.type || ''
    const pointerType = String(event?.pointerType || '').toLowerCase()
    const isTouchPointer = eventType === 'pointerdown' && pointerType === 'touch'

    if (eventType === 'pointerdown' && !isTouchPointer) return

    if (isTouchPointer) {
      suppressSuggestionClickRef.current = true
      suppressSuggestionClickTimerRef.current = window.setTimeout(() => {
        if (suppressSuggestionClickRef.current) suppressSuggestionClickRef.current = false
        suppressSuggestionClickTimerRef.current = 0
      }, 250)
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      handleManualValueSelect(value)
      return
    }

    if (eventType === 'touchstart') {
      suppressSuggestionClickRef.current = true
      suppressSuggestionClickTimerRef.current = window.setTimeout(() => {
        if (suppressSuggestionClickRef.current) suppressSuggestionClickRef.current = false
        suppressSuggestionClickTimerRef.current = 0
      }, 250)
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      handleManualValueSelect(value)
      return
    }

    if (eventType === 'click' && suppressSuggestionClickRef.current) {
      suppressSuggestionClickRef.current = false
      clearSuggestionClickSuppression()
      return
    }

    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    clearSuggestionClickSuppression()
    suppressSuggestionClickRef.current = false
    handleManualValueSelect(value)
  }

  const showScannerPreview = phase === 'preflight' || phase === 'requesting' || phase === 'scanning'
  const noMatchMessage =
    manualSearchQuery.length >= MIN_MANUAL_SERIAL_QUERY_LENGTH &&
    !isManualSearchLoading &&
    !manualSerialOptions.length
      ? 'No matching stored S/N values found.'
      : null
  const searchPromptMessage =
    manualSearchQuery.length > 0 && manualSearchQuery.length < MIN_MANUAL_SERIAL_QUERY_LENGTH
      ? 'Type at least 2 characters to search stored S/N values.'
      : null

  const showScanningSpinner =
    phase === 'preflight' || phase === 'requesting' || phase === 'image_decode'
  const showScanningHint = phase === 'scanning'
  const showStartButton = phase === 'ready' || phase === 'error' || phase === 'idle'
  const currentAlertColor =
    failure?.type === SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE ? 'warning' : 'danger'
  const showFailureAlert =
    Boolean(failure) && failure?.type !== SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE
  const showFailureMessage = Boolean(failure?.message && failure.message !== SCAN_UNSUCCESSFUL_HINT)
  const hasManualValue = Boolean(text(manualValue))
  const showManualError =
    Boolean(manualError) && manualError !== noMatchMessage && manualError !== searchPromptMessage

  const content = (
    <>
      {showScannerPreview ? (
        <div className="inspection-fire-extinguisher-scanner rounded-3 overflow-hidden bg-dark mx-auto">
          <video
            ref={videoRef}
            className="inspection-fire-extinguisher-scanner__video d-block"
            muted
            playsInline
            aria-label="Fire extinguisher scanner camera preview"
          />
        </div>
      ) : null}
      <div className="d-grid gap-2">
        {showStartButton ? (
          <CButton color="secondary" variant="outline" disabled={isChecking} onClick={startCamera}>
            {failure ? 'Retry camera' : 'Start camera'}
          </CButton>
        ) : null}
      </div>
      {showScanningSpinner ? (
        <div className="small text-body-secondary d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          <span>
            {phase === 'preflight'
              ? 'Checking camera access...'
              : phase === 'image_decode'
                ? 'Decoding selected image...'
                : 'Requesting camera access...'}
          </span>
        </div>
      ) : null}
      {showScanningHint ? (
        <div className="small text-body-secondary">
          Point the rear camera at the FE QR code or barcode.
        </div>
      ) : null}
      {scanHint ? <div className="small text-body-secondary">{scanHint}</div> : null}
      {showFailureAlert ? (
        <CAlert color={currentAlertColor} className="mb-0">
          <div className="fw-semibold mb-1">{failure.title}</div>
          {showFailureMessage ? <div>{failure.message}</div> : null}
        </CAlert>
      ) : null}
      <div className="d-flex align-items-center gap-3 text-body-secondary small">
        <div className="flex-grow-1 border-top" />
        <span className="fw-semibold">OR</span>
        <div className="flex-grow-1 border-top" />
      </div>
      <div>
        <div className="position-relative">
          <CFormInput
            ref={manualInputRef}
            label="Enter FE code manually"
            aria-label="Enter fire extinguisher code manually"
            autoComplete="off"
            value={manualValue}
            placeholder="Type FE serial, unit no, or last 4-6 digits"
            onChange={(event) => {
              setManualError('')
              setManualValue(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && text(manualValue)) submitManualValue()
            }}
          />
          {manualSerialOptions.length > 0 ? (
            <div
              className="position-absolute top-100 start-0 end-0 z-3 mt-1 bg-body border rounded shadow-sm overflow-hidden vmecc-scroll-y"
              style={{ maxHeight: '11rem' }}
            >
              {manualSerialOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="d-block w-100 text-start border-0 bg-transparent py-2 px-3"
                  onTouchStart={activateManualSuggestion(option.value)}
                  onClick={activateManualSuggestion(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      activateManualSuggestion(option.value)(event)
                    }
                  }}
                  onPointerDown={activateManualSuggestion(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {searchPromptMessage ? (
          <div className="small text-body-secondary mt-1">{searchPromptMessage}</div>
        ) : null}
        {isManualSearchLoading ? (
          <div className="small text-body-secondary mt-1">Searching stored S/N values...</div>
        ) : null}
        {manualSearchError ? (
          <div className="small text-danger mt-1">{manualSearchError}</div>
        ) : null}
        {noMatchMessage ? (
          <div className="small text-body-secondary mt-1">{noMatchMessage}</div>
        ) : null}
        {showManualError ? <div className="small text-danger mt-2">{manualError}</div> : null}
      </div>
      {diagnostics ? (
        <details className="small text-body-secondary">
          <summary>Scanner diagnostics</summary>
          <div className="mt-2 d-grid gap-1">
            <div>Failure: {diagnostics.failureType || 'unknown'}</div>
            <div>Permission: {diagnostics.permissionState || 'unknown'}</div>
            <div>Display mode: {diagnostics.displayMode || 'unknown'}</div>
            <div>Secure context: {diagnostics.secureContext ? 'yes' : 'no'}</div>
            <div>Top-level page: {diagnostics.topLevelContext ? 'yes' : 'no'}</div>
            {diagnostics.policyAllowsCamera === null ? null : (
              <div>Policy allows camera: {diagnostics.policyAllowsCamera ? 'yes' : 'no'}</div>
            )}
            <div>Media devices supported: {diagnostics.supportsMediaDevices ? 'yes' : 'no'}</div>
            {diagnostics.decodedFormat ? (
              <div>Decoded format: {diagnostics.decodedFormat}</div>
            ) : null}
            {diagnostics.rejectionReason ? (
              <div>Rejected scan: {diagnostics.rejectionReason}</div>
            ) : null}
            {diagnostics.lastDecodedText ? (
              <div>Last decoded text: {diagnostics.lastDecodedText}</div>
            ) : null}
            <div>
              Service worker controlled: {diagnostics.serviceWorkerControlled ? 'yes' : 'no'}
            </div>
            {diagnostics.serviceWorkerCacheVersion ? (
              <div>Service worker cache: {diagnostics.serviceWorkerCacheVersion}</div>
            ) : null}
            {diagnostics.phase ? <div>Phase: {diagnostics.phase}</div> : null}
            {diagnostics.selectedConstraint ? (
              <div>Constraint: {diagnostics.selectedConstraint}</div>
            ) : null}
            {diagnostics.selectedDeviceLabel || diagnostics.selectedDeviceId ? (
              <div>Device: {diagnostics.selectedDeviceLabel || diagnostics.selectedDeviceId}</div>
            ) : null}
            {diagnostics.errorName ? <div>Error: {diagnostics.errorName}</div> : null}
            {diagnostics.errorMessage ? <div>Message: {diagnostics.errorMessage}</div> : null}
          </div>
        </details>
      ) : null}
    </>
  )

  const footer = (
    <>
      <CButton color="secondary" variant="outline" onClick={onClose}>
        Cancel
      </CButton>
      <CButton
        color="primary"
        disabled={isChecking || !hasManualValue}
        onClick={() => submitManualValue()}
      >
        {isChecking ? 'Checking...' : 'Check FE'}
      </CButton>
    </>
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title={SCANNER_TITLE} onClose={onClose}>
        <div className="d-grid gap-3">
          {content}
          <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
            {footer}
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{SCANNER_TITLE}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">{content}</CModalBody>
      <CModalFooter>{footer}</CModalFooter>
    </CModal>
  )
}

export default FireExtinguisherScanner
