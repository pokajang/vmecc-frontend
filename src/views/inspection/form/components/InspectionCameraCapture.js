import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { Camera } from 'lucide-react'
import {
  captureInspectionCameraFrame,
  startInspectionCameraStream,
  stopInspectionCameraStream,
} from '../inspectionCameraCaptureUtils'

const cameraErrorMessage = (error) => {
  const name = String(error?.name || '')
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'In-app camera permission was not granted. Upload the photo instead.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No in-app camera was found. Upload the photo instead.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy in another app. Upload the photo instead.'
  }
  return String(error?.message || '').trim() || 'The in-app camera could not start.'
}

const DEFAULT_CAMERA_STARTUP_TIMEOUT_MS = 10_000

const InspectionCameraCapture = ({
  visible,
  onCapture,
  onClose,
  onUploadPhoto,
  startCameraStream = startInspectionCameraStream,
  captureFrame = captureInspectionCameraFrame,
  cameraStartupTimeoutMs = DEFAULT_CAMERA_STARTUP_TIMEOUT_MS,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const sessionRef = useRef(0)
  const startupTimeoutRef = useRef(null)
  const [phase, setPhase] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const clearStartupTimeout = useCallback(() => {
    if (startupTimeoutRef.current === null) return
    window.clearTimeout(startupTimeoutRef.current)
    startupTimeoutRef.current = null
  }, [])

  const stopCamera = useCallback(() => {
    clearStartupTimeout()
    stopInspectionCameraStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [clearStartupTimeout])

  useEffect(() => {
    if (!visible) {
      sessionRef.current += 1
      stopCamera()
      return undefined
    }

    const session = sessionRef.current + 1
    sessionRef.current = session
    const startTimer = window.setTimeout(() => {
      if (sessionRef.current !== session) return
      setPhase('starting')
      setErrorMessage('')
      startupTimeoutRef.current = window.setTimeout(() => {
        if (sessionRef.current !== session) return
        sessionRef.current += 1
        stopCamera()
        setErrorMessage('The in-app camera took too long to start. Upload the photo instead.')
        setPhase('error')
      }, cameraStartupTimeoutMs)

      void startCameraStream()
        .then(async (stream) => {
          if (sessionRef.current !== session) {
            stopInspectionCameraStream(stream)
            return
          }
          streamRef.current = stream
          const video = videoRef.current
          if (!video) throw new Error('Camera preview is unavailable.')
          video.srcObject = stream
          const playResult = video.play?.()
          await playResult?.catch(() => undefined)
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            clearStartupTimeout()
            setPhase('ready')
          } else {
            setPhase('streaming')
          }
        })
        .catch((error) => {
          if (sessionRef.current !== session) return
          stopCamera()
          setErrorMessage(cameraErrorMessage(error))
          setPhase('error')
        })
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      sessionRef.current += 1
      stopCamera()
    }
  }, [cameraStartupTimeoutMs, clearStartupTimeout, startCameraStream, stopCamera, visible])

  const handleCapture = async () => {
    if (phase !== 'ready') return
    setPhase('capturing')
    setErrorMessage('')
    try {
      const file = await captureFrame({ video: videoRef.current })
      stopCamera()
      onCapture?.(file)
    } catch (error) {
      stopCamera()
      setErrorMessage(cameraErrorMessage(error))
      setPhase('error')
    }
  }

  const handleUploadPhoto = () => {
    stopCamera()
    onClose?.()
    onUploadPhoto?.()
  }

  const handleClose = () => {
    stopCamera()
    onClose?.()
  }

  const isStarting = phase === 'starting' || phase === 'streaming'
  const isCapturing = phase === 'capturing'
  const canUploadPhoto = typeof onUploadPhoto === 'function'

  return (
    <CModal
      alignment="center"
      visible={visible}
      onClose={handleClose}
      backdrop="static"
      fullscreen="sm"
    >
      <CModalHeader>
        <CModalTitle>Take inspection photo</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div className="inspection-camera-capture bg-dark rounded-3 overflow-hidden">
          <video
            ref={videoRef}
            className="inspection-camera-capture__video"
            muted
            playsInline
            autoPlay
            aria-label="Inspection camera preview"
            onCanPlay={() => {
              if (streamRef.current) {
                clearStartupTimeout()
                setPhase((current) =>
                  current === 'starting' || current === 'streaming' ? 'ready' : current,
                )
              }
            }}
          />
          {isStarting ? (
            <div className="inspection-camera-capture__status text-white">
              <CSpinner size="sm" />
              <span>Starting rear camera…</span>
            </div>
          ) : null}
        </div>

        <div className="small text-body-secondary">
          Photos are captured at a mobile-safe resolution, then uploaded securely.
        </div>

        {errorMessage ? (
          <CAlert color="warning" className="mb-0">
            {errorMessage}
          </CAlert>
        ) : null}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={handleClose} disabled={isCapturing}>
          Cancel
        </CButton>
        {canUploadPhoto ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="ms-auto d-inline-flex align-items-center gap-2 opacity-75 border-0 text-body-secondary"
            onClick={handleUploadPhoto}
            disabled={isCapturing}
          >
            Upload photo
          </CButton>
        ) : null}
        <CButton
          color="primary"
          className="d-inline-flex align-items-center gap-2"
          disabled={phase !== 'ready'}
          onClick={handleCapture}
        >
          {isCapturing ? <CSpinner size="sm" /> : <Camera size={17} aria-hidden="true" />}
          {isCapturing ? 'Capturing…' : 'Capture photo'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default InspectionCameraCapture
