import React, { useRef, useState } from 'react'
import EvidenceImage from './EvidenceImage'
import PhotoLightbox from './PhotoLightbox'
import {
  dedupeMediaPhotos,
  getEvidencePhotoLabel,
  getMeaningfulPhotoCaption,
  getPhotoKey,
} from './mediaUtils'

const EvidencePhotoGallery = ({
  photos = [],
  title = 'Evidence photos',
  contextLabel = 'Evidence',
  hiddenDescriptionValues = [],
  className = '',
}) => {
  const visiblePhotos = dedupeMediaPhotos(photos)
  const triggerRefs = useRef([])
  const [selectedIndex, setSelectedIndex] = useState(null)

  if (!visiblePhotos.length) return null

  const closeViewer = () => {
    const returnIndex = selectedIndex
    setSelectedIndex(null)
    window.requestAnimationFrame(() => triggerRefs.current[returnIndex]?.focus())
  }

  return (
    <>
      <div
        className={`evidence-photo-gallery ${className}`.trim()}
        data-photo-count={visiblePhotos.length}
        aria-label={title}
      >
        {visiblePhotos.map((photo, index) => {
          const caption = getMeaningfulPhotoCaption(photo, hiddenDescriptionValues)
          const label = getEvidencePhotoLabel({
            photo,
            index,
            count: visiblePhotos.length,
            contextLabel,
          })
          return (
            <figure key={getPhotoKey(photo, index)} className="evidence-photo-gallery__item">
              <button
                ref={(element) => {
                  triggerRefs.current[index] = element
                }}
                type="button"
                className="evidence-photo-gallery__trigger"
                aria-label={`View photo ${index + 1}: ${caption || label}`}
                onClick={() => setSelectedIndex(index)}
              >
                <EvidenceImage
                  photo={photo}
                  alt={caption || label}
                  className="evidence-photo-gallery__image"
                />
              </button>
              {caption ? (
                <figcaption className="evidence-photo-gallery__caption">{caption}</figcaption>
              ) : null}
            </figure>
          )
        })}
      </div>
      <PhotoLightbox
        photos={visiblePhotos}
        selectedIndex={selectedIndex}
        title={title}
        contextLabel={contextLabel}
        hiddenDescriptionValues={hiddenDescriptionValues}
        onSelect={setSelectedIndex}
        onClose={closeViewer}
      />
    </>
  )
}

export default EvidencePhotoGallery
