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
import { Camera, Smartphone } from 'lucide-react'
import {
  captureInspectionCameraFrame,
  startInspectionCameraStream,
  stopInspectionCameraStream,
} from '../inspectionCameraCaptureUtils'

const cameraErrorMessage = (error) => {
  const name = String(error?.name || '')
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'In-app camera permission was not granted. Use the phone camera option below.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No in-app camera was found. Use the phone camera option below.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy in another app. Close it there, or use the phone camera option.'
  }
  return String(error?.message || '').trim() || 'The in-app camera could not start.'
}

const InspectionCameraCapture = ({
  visible,
  onCapture,
  onClose,
  onUseNativeCamera,
  startCameraStream = startInspectionCameraStream,
  captureFrame = captureInspectionCameraFrame,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const sessionRef = useRef(0)
  const [phase, setPhase] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const stopCamera = useCallback(() => {
    stopInspectionCameraStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

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
          if (video.videoWidth > 0 && video.videoHeight > 0) setPhase('ready')
          else setPhase('streaming')
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
  }, [startCameraStream, stopCamera, visible])

  const handleCapture = async () => {
    if (phase !== 'ready') return
    setPhase('capturing')
    setErrorMessage('')
    try {
      const file = await captureFrame({ video: videoRef.current })
      stopCamera()
      await onCapture?.(file)
    } catch (error) {
      setErrorMessage(cameraErrorMessage(error))
      setPhase(streamRef.current ? 'ready' : 'error')
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose?.()
  }

  const handleNativeCamera = () => {
    stopCamera()
    onUseNativeCamera?.()
  }

  const isStarting = phase === 'starting' || phase === 'streaming'
  const isCapturing = phase === 'capturing'

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
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          className="d-inline-flex align-items-center gap-2"
          onClick={handleNativeCamera}
          disabled={isCapturing}
        >
          <Smartphone size={17} aria-hidden="true" />
          Use phone camera
        </CButton>
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
