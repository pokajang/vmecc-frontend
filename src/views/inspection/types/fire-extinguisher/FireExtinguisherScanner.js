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

const FireExtinguisherScanner = ({ isChecking = false, visible = false, onClose, onScan }) => {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const streamRef = useRef(null)
  const onScanRef = useRef(onScan)
  const scannedRef = useRef(false)
  const timeoutRef = useRef(null)
  const failureLoggedRef = useRef(false)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')
  const [phase, setPhase] = useState('idle')
  const [failure, setFailure] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [scanAttempt, setScanAttempt] = useState(0)

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
      clearActiveScanner()
      scannedRef.current = false
      failureLoggedRef.current = false
      return undefined
    }

    let cancelled = false
    scannedRef.current = false
    failureLoggedRef.current = false
    queueMicrotask(() => {
      if (cancelled) return
      setManualError('')
      setFailure(null)
      setDiagnostics(null)
    })

    const handleScannerFailure = ({
      error,
      environment,
      failureType,
      nextPhase,
      selectedDevice,
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

    const startScanner = async () => {
      const reader = new BrowserMultiFormatReader()
      let environment = null
      let selectedDevice = null

      try {
        setPhase('preflight')
        environment = await inspectScannerEnvironment()
        if (cancelled) return

        const preflightFailureType = classifyScannerFailure({
          environment,
          error: null,
          phase: 'preflight',
        })
        if (
          preflightFailureType === SCANNER_FAILURE_TYPES.INSECURE_CONTEXT ||
          preflightFailureType === SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER ||
          preflightFailureType === SCANNER_FAILURE_TYPES.POLICY_BLOCKED
        ) {
          handleScannerFailure({
            error: new Error('Scanner preflight failed.'),
            environment,
            failureType: preflightFailureType,
            nextPhase: 'preflight',
          })
          return
        }

        setPhase('requesting')
        const bootstrapStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        })
        if (cancelled) {
          stopMediaStream(bootstrapStream)
          return
        }

        streamRef.current = bootstrapStream
        const streamDevice = getStreamDeviceDetails(bootstrapStream)
        environment = {
          ...environment,
          permissionState:
            environment.permissionState === 'granted'
              ? 'granted'
              : await getCameraPermissionState(),
        }

        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        selectedDevice = selectPreferredVideoDevice(devices, streamDevice.deviceId) || streamDevice
        clearActiveScanner()

        setPhase('scanning')
        const selectedDeviceId = text(selectedDevice?.deviceId) || undefined
        const controls = await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (!result || cancelled || scannedRef.current) return
            const locator = extractFireExtinguisherLocator(
              result.getText?.() || String(result || ''),
            )
            if (!locator) return
            scannedRef.current = true
            clearActiveScanner()
            onScanRef.current?.(locator)
          },
        )
        if (cancelled) {
          controls.stop?.()
          return
        }

        controlsRef.current = controls
        timeoutRef.current = window.setTimeout(() => {
          if (cancelled || scannedRef.current) return
          handleScannerFailure({
            error: {
              name: 'ScanTimeoutError',
              message: 'Timed out waiting for a readable QR or barcode.',
            },
            environment,
            failureType: SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE,
            nextPhase: 'scanning',
            selectedDevice,
          })
        }, SCAN_TIMEOUT_MS)
      } catch (nextError) {
        if (cancelled) return
        handleScannerFailure({
          error: nextError,
          environment: environment || (await inspectScannerEnvironment()),
          nextPhase: selectedDevice ? 'scanning' : 'requesting',
          selectedDevice,
        })
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      clearActiveScanner()
    }
  }, [scanAttempt, visible])

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

  const retryCamera = () => {
    clearActiveScanner()
    scannedRef.current = false
    failureLoggedRef.current = false
    setFailure(null)
    setDiagnostics(null)
    setManualError('')
    setScanAttempt((current) => current + 1)
  }

  const showScanningSpinner = phase === 'preflight' || phase === 'requesting'
  const showScanningHint = phase === 'scanning'
  const showRetryButton = failure?.canRetry === true
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
        {showScanningSpinner ? (
          <div className="small text-body-secondary d-flex align-items-center gap-2">
            <CSpinner size="sm" />
            <span>
              {phase === 'preflight' ? 'Checking camera access...' : 'Requesting camera access...'}
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
              <div>Secure context: {diagnostics.secureContext ? 'yes' : 'no'}</div>
              <div>Top-level page: {diagnostics.topLevelContext ? 'yes' : 'no'}</div>
              {diagnostics.policyAllowsCamera === null ? null : (
                <div>Policy allows camera: {diagnostics.policyAllowsCamera ? 'yes' : 'no'}</div>
              )}
              {diagnostics.selectedDeviceLabel || diagnostics.selectedDeviceId ? (
                <div>Device: {diagnostics.selectedDeviceLabel || diagnostics.selectedDeviceId}</div>
              ) : null}
              {diagnostics.errorName ? <div>Error: {diagnostics.errorName}</div> : null}
            </div>
          </details>
        ) : null}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        {showRetryButton ? (
          <CButton color="secondary" variant="outline" disabled={isChecking} onClick={retryCamera}>
            Retry camera
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
