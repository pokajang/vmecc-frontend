import React, { useEffect, useRef, useState } from 'react'
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
import { BrowserMultiFormatReader } from '@zxing/browser'
import { logError } from 'src/services/logger'
import { extractFireExtinguisherLocator } from './locator'
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
const SCAN_TIMEOUT_MS = 20000

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

const decodeImageWithReader = async (reader, objectUrl) => {
  if (typeof reader.decodeFromImageUrl === 'function') {
    return reader.decodeFromImageUrl(objectUrl)
  }

  if (typeof reader.decodeFromImageElement !== 'function') {
    throw new Error('ZXing image decode is unavailable in this browser.')
  }

  const image = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Unable to read selected scanner image.'))
    element.src = objectUrl
  })

  return reader.decodeFromImageElement(image)
}

const FireExtinguisherScanner = ({ isChecking = false, visible = false, onClose, onScan }) => {
  const videoRef = useRef(null)
  const imageInputRef = useRef(null)
  const controlsRef = useRef(null)
  const streamRef = useRef(null)
  const onScanRef = useRef(onScan)
  const sessionRef = useRef(0)
  const scannedRef = useRef(false)
  const timeoutRef = useRef(null)
  const failureLoggedRef = useRef(false)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')
  const [phase, setPhase] = useState('ready')
  const [failure, setFailure] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)

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
  }

  useEffect(() => {
    if (!visible) {
      sessionRef.current += 1
      clearActiveScanner()
      scannedRef.current = false
      failureLoggedRef.current = false
      setPhase('ready')
      setFailure(null)
      setDiagnostics(null)
      setManualError('')
      return undefined
    }

    scannedRef.current = false
    failureLoggedRef.current = false
    setPhase('ready')
    setFailure(null)
    setDiagnostics(null)
    setManualError('')

    return () => {
      sessionRef.current += 1
      clearActiveScanner()
    }
  }, [visible])

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
    const nextDiagnostics = buildScannerDiagnostics({
      environment,
      error,
      failureType: resolvedFailureType,
      selectedDevice,
      phase: nextPhase,
      selectedConstraint,
    })

    clearActiveScanner()
    setPhase('error')
    setFailure({
      type: resolvedFailureType,
      ...content,
    })
    setDiagnostics(nextDiagnostics)

    if (!failureLoggedRef.current) {
      failureLoggedRef.current = true
      logError(
        '[FireExtinguisherScanner] camera access failed',
        error || new Error(content.title),
        {
          ...nextDiagnostics,
        },
      )
    }
  }

  const completeScan = (rawValue) => {
    if (scannedRef.current) return false
    const locator = extractFireExtinguisherLocator(rawValue)
    if (!locator) return false
    scannedRef.current = true
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
    setManualError('')
    setFailure(null)
    setDiagnostics(null)

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

      const reader = new BrowserMultiFormatReader()
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
          completeScan(result.getText?.() || String(result || ''))
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

  const scanImageFile = async (event) => {
    const file = event?.target?.files?.[0]
    if (event?.target) event.target.value = ''
    if (!file || isChecking) return

    const session = sessionRef.current + 1
    sessionRef.current = session
    const isCurrentSession = () => visible && sessionRef.current === session
    const reader = new BrowserMultiFormatReader()
    const objectUrl = URL.createObjectURL(file)
    let environment = null

    clearActiveScanner()
    scannedRef.current = false
    failureLoggedRef.current = false
    setManualError('')
    setFailure(null)
    setDiagnostics(null)
    setPhase('image_decode')

    try {
      environment = await inspectScannerEnvironment()
      const result = await decodeImageWithReader(reader, objectUrl)
      if (!isCurrentSession()) return
      if (!completeScan(result?.getText?.() || String(result || ''))) {
        handleScannerFailure({
          error: {
            name: 'ScanTimeoutError',
            message: 'No FE QR or barcode could be decoded from the selected image.',
          },
          environment,
          failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
          nextPhase: 'image_decode',
        })
      }
    } catch (error) {
      if (!isCurrentSession()) return
      handleScannerFailure({
        error,
        environment: environment || (await inspectScannerEnvironment()),
        failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
        nextPhase: 'image_decode',
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const submitManualValue = () => {
    if (isChecking) return
    const locator = extractFireExtinguisherLocator(manualValue)
    if (!locator) {
      setManualError('Enter a valid S/N, QR, or barcode value.')
      return
    }
    setManualError('')
    onScan?.(locator)
  }

  const triggerImageScan = () => {
    if (isChecking) return
    imageInputRef.current?.click()
  }

  const showScanningSpinner =
    phase === 'preflight' || phase === 'requesting' || phase === 'image_decode'
  const showReadyHint = phase === 'ready'
  const showScanningHint = phase === 'scanning'
  const showStartButton = phase === 'ready' || phase === 'error' || phase === 'idle'
  const currentAlertColor =
    failure?.type === SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE ? 'warning' : 'danger'

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Scan Fire Extinguisher</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div className="inspection-fire-extinguisher-scanner rounded-3 overflow-hidden bg-dark mx-auto">
          <video
            ref={videoRef}
            className="inspection-fire-extinguisher-scanner__video d-block"
            muted
            playsInline
            aria-label="Fire extinguisher scanner camera preview"
          />
        </div>
        {showReadyHint ? (
          <div className="small text-body-secondary">
            Tap Start camera to request camera access, or scan from an uploaded image.
          </div>
        ) : null}
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
        {failure ? (
          <CAlert color={currentAlertColor} className="mb-0">
            <div className="fw-semibold mb-1">{failure.title}</div>
            <div>{failure.message}</div>
          </CAlert>
        ) : null}
        <div>
          <CFormInput
            label="Enter FE code manually"
            value={manualValue}
            placeholder="Example: SR102014Z060198"
            onChange={(event) => {
              setManualError('')
              setManualValue(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && text(manualValue)) submitManualValue()
            }}
          />
          {manualError ? <div className="small text-danger mt-2">{manualError}</div> : null}
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
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="d-none"
          aria-label="Scan FE code from image"
          onChange={scanImageFile}
        />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="secondary"
          variant="outline"
          disabled={
            isChecking ||
            phase === 'preflight' ||
            phase === 'requesting' ||
            phase === 'image_decode'
          }
          onClick={triggerImageScan}
        >
          Scan from image
        </CButton>
        {showStartButton ? (
          <CButton color="secondary" variant="outline" disabled={isChecking} onClick={startCamera}>
            {failure ? 'Retry camera' : 'Start camera'}
          </CButton>
        ) : null}
        <CButton color="primary" disabled={isChecking} onClick={submitManualValue}>
          {isChecking ? 'Checking...' : 'Check FE'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FireExtinguisherScanner
