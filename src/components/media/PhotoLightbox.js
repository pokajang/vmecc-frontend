import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CButton, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from 'lucide-react'
import useMediaQuery from 'src/hooks/useMediaQuery'
import EvidenceImage from './EvidenceImage'
import { clampPhotoZoom, getEvidencePhotoLabel, getMeaningfulPhotoCaption } from './mediaUtils'

const PhotoLightbox = ({
  photos = [],
  selectedIndex = null,
  title = 'Evidence photos',
  contextLabel = 'Evidence',
  hiddenDescriptionValues = [],
  onSelect,
  onClose,
}) => {
  const isMobile = useMediaQuery('(max-width: 575.98px)')
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const lastTouchTapRef = useRef(0)
  const [viewMode, setViewMode] = useState('fit')
  const [zoom, setZoom] = useState(1)
  const photo = selectedIndex === null ? null : photos[selectedIndex]
  const caption = photo ? getMeaningfulPhotoCaption(photo, hiddenDescriptionValues) : ''

  const resetView = useCallback((mode = 'fit') => {
    setViewMode(mode)
    setZoom(1)
    if (stageRef.current) {
      stageRef.current.scrollLeft = 0
      stageRef.current.scrollTop = 0
    }
  }, [])

  const changePhoto = useCallback(
    (nextIndex) => {
      resetView()
      onSelect?.(nextIndex)
    },
    [onSelect, resetView],
  )

  const adjustZoom = useCallback(
    (amount) => {
      setViewMode('zoom')
      setZoom((current) => clampPhotoZoom((viewMode === 'fit' ? 1 : current) + amount))
    },
    [viewMode],
  )

  const closeLightbox = useCallback(() => {
    resetView()
    onClose?.()
  }, [onClose, resetView])

  useEffect(() => {
    if (selectedIndex === null) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' && photos.length > 1) {
        event.preventDefault()
        changePhoto((selectedIndex - 1 + photos.length) % photos.length)
      } else if (event.key === 'ArrowRight' && photos.length > 1) {
        event.preventDefault()
        changePhoto((selectedIndex + 1) % photos.length)
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        adjustZoom(0.25)
      } else if (event.key === '-') {
        event.preventDefault()
        adjustZoom(-0.25)
      } else if (event.key === '0') {
        event.preventDefault()
        resetView()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjustZoom, changePhoto, photos.length, resetView, selectedIndex])

  if (!photo) return null

  const label = getEvidencePhotoLabel({
    photo,
    index: selectedIndex,
    count: photos.length,
    contextLabel,
  })
  const previousIndex = (selectedIndex - 1 + photos.length) % photos.length
  const nextIndex = (selectedIndex + 1) % photos.length
  const canPan = viewMode !== 'fit'

  return (
    <CModal
      visible
      onClose={closeLightbox}
      size="xl"
      fullscreen={isMobile}
      scrollable={false}
      className="photo-lightbox"
      aria-labelledby="photo-lightbox-title"
    >
      <CModalHeader onClose={closeLightbox}>
        <CModalTitle id="photo-lightbox-title">{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="photo-lightbox__body">
        <div
          ref={stageRef}
          className={`photo-lightbox__stage photo-lightbox__stage--${viewMode}`}
          onDoubleClick={() => (viewMode === 'fit' ? adjustZoom(1) : resetView())}
          onPointerDown={(event) => {
            if (!canPan || !stageRef.current) return
            dragRef.current = {
              x: event.clientX,
              y: event.clientY,
              left: stageRef.current.scrollLeft,
              top: stageRef.current.scrollTop,
              moved: false,
            }
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (!dragRef.current || !stageRef.current) return
            if (
              Math.abs(event.clientX - dragRef.current.x) > 4 ||
              Math.abs(event.clientY - dragRef.current.y) > 4
            ) {
              dragRef.current.moved = true
            }
            stageRef.current.scrollLeft = dragRef.current.left - (event.clientX - dragRef.current.x)
            stageRef.current.scrollTop = dragRef.current.top - (event.clientY - dragRef.current.y)
          }}
          onPointerUp={(event) => {
            const wasTap = !dragRef.current?.moved
            dragRef.current = null
            if (event.pointerType !== 'touch' || !wasTap) return
            const now = Date.now()
            if (now - lastTouchTapRef.current < 320) {
              viewMode === 'fit' ? adjustZoom(1) : resetView()
              lastTouchTapRef.current = 0
              return
            }
            lastTouchTapRef.current = now
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          <EvidenceImage
            photo={photo}
            preferFullSize
            alt={caption || label}
            className={`photo-lightbox__image${
              viewMode === 'original' ? ' report-photo-viewer__image--original' : ''
            }`}
            style={{ transform: viewMode === 'zoom' ? `scale(${zoom})` : undefined }}
          />
        </div>

        <div className="photo-lightbox__toolbar" role="toolbar" aria-label="Photo viewer controls">
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => adjustZoom(-0.25)}
            aria-label="Zoom out"
          >
            <Minus size={16} aria-hidden="true" />
          </CButton>
          <span className="photo-lightbox__zoom small text-body-secondary" aria-live="polite">
            {viewMode === 'fit'
              ? 'Fit'
              : viewMode === 'original'
                ? '100%'
                : `${Math.round(zoom * 100)}%`}
          </span>
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => adjustZoom(0.25)}
            aria-label="Zoom in"
          >
            <Plus size={16} aria-hidden="true" />
          </CButton>
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => resetView()}
            aria-label="Fit photo to viewer"
            aria-pressed={viewMode === 'fit'}
          >
            <Maximize2 size={16} aria-hidden="true" />
            Fit
          </CButton>
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => resetView('original')}
            aria-label="View photo at original size"
            aria-pressed={viewMode === 'original'}
          >
            100%
          </CButton>
        </div>

        {caption ? <div className="photo-lightbox__caption">{caption}</div> : null}

        <div className="photo-lightbox__navigation">
          {photos.length > 1 ? (
            <CButton
              type="button"
              color="light"
              onClick={() => changePhoto(previousIndex)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={17} aria-hidden="true" />
              Previous
            </CButton>
          ) : (
            <span />
          )}
          <div className="small text-body-secondary text-center" aria-live="polite">
            {selectedIndex + 1} of {photos.length}
          </div>
          {photos.length > 1 ? (
            <CButton
              type="button"
              color="light"
              onClick={() => changePhoto(nextIndex)}
              aria-label="Next photo"
            >
              Next
              <ChevronRight size={17} aria-hidden="true" />
            </CButton>
          ) : (
            <span />
          )}
        </div>
      </CModalBody>
    </CModal>
  )
}

export default PhotoLightbox
