import React, { useEffect, useRef, useState } from 'react'
import {
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { extractFireExtinguisherLocator } from './locator'

const text = (value) => String(value || '').trim()

const FireExtinguisherScanner = ({ isChecking = false, visible = false, onClose, onScan }) => {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const onScanRef = useRef(onScan)
  const scannedRef = useRef(false)
  const [manualValue, setManualValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!visible) {
      controlsRef.current?.stop?.()
      controlsRef.current = null
      scannedRef.current = false
      return undefined
    }

    let cancelled = false
    const resetErrorTimer = window.setTimeout(() => {
      if (!cancelled) setError('')
    }, 0)
    scannedRef.current = false
    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || cancelled || scannedRef.current) return
        const locator = extractFireExtinguisherLocator(result.getText?.() || String(result || ''))
        if (!locator) return
        scannedRef.current = true
        controlsRef.current?.stop?.()
        controlsRef.current = null
        onScanRef.current?.(locator)
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop?.()
          return
        }
        controlsRef.current = controls
      })
      .catch((nextError) => {
        if (cancelled) return
        setError(
          nextError?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Enter the FE code below.'
            : 'Camera scanning is unavailable. Enter the FE code below.',
        )
      })

    return () => {
      cancelled = true
      window.clearTimeout(resetErrorTimer)
      controlsRef.current?.stop?.()
      controlsRef.current = null
    }
  }, [visible])

  const submitManualValue = () => {
    if (isChecking) return
    const locator = extractFireExtinguisherLocator(manualValue)
    if (!locator) {
      setError('Enter a valid S/N, QR, or barcode value.')
      return
    }
    onScan?.(locator)
  }

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
        {error ? <div className="small text-danger">{error}</div> : null}
        <div>
          <CFormInput
            label="Enter FE code manually"
            value={manualValue}
            placeholder="Example: SR102014Z060198"
            onChange={(event) => {
              setError('')
              setManualValue(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && text(manualValue)) submitManualValue()
            }}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" disabled={isChecking} onClick={submitManualValue}>
          {isChecking ? 'Checking...' : 'Check FE'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FireExtinguisherScanner
