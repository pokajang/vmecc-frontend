import React, { useState } from 'react'
import { getPhotoSources } from './mediaUtils'

const EvidenceImageSource = ({
  preferred,
  fallback,
  sourceWidth,
  sourceHeight,
  alt = '',
  className = '',
  onLoad,
  ...imageProps
}) => {
  const [source, setSource] = useState(preferred)
  const [failed, setFailed] = useState(!preferred)
  const [loaded, setLoaded] = useState(false)

  if (failed) {
    return <div className="evidence-image__fallback">Image unavailable</div>
  }

  return (
    <img
      {...imageProps}
      src={source}
      alt={alt}
      className={`${className}${loaded ? '' : ' evidence-image--loading'}`.trim()}
      width={imageProps.width ?? (sourceWidth > 0 ? sourceWidth : undefined)}
      height={imageProps.height ?? (sourceHeight > 0 ? sourceHeight : undefined)}
      loading="lazy"
      decoding="async"
      aria-busy={!loaded}
      onLoad={(event) => {
        setLoaded(true)
        onLoad?.(event)
      }}
      onError={() => {
        if (source === preferred && fallback) {
          setSource(fallback)
          setLoaded(false)
          return
        }
        setFailed(true)
      }}
    />
  )
}

const EvidenceImage = ({ photo, preferFullSize = false, ...imageProps }) => {
  const { preferred, fallback } = getPhotoSources(photo, preferFullSize)
  const sourceWidth = Number(
    preferFullSize ? photo?.width : photo?.thumbnailWidth || photo?.thumbnail_width || photo?.width,
  )
  const sourceHeight = Number(
    preferFullSize
      ? photo?.height
      : photo?.thumbnailHeight || photo?.thumbnail_height || photo?.height,
  )

  return (
    <EvidenceImageSource
      key={`${preferred}|${fallback}`}
      {...imageProps}
      preferred={preferred}
      fallback={fallback}
      sourceWidth={sourceWidth}
      sourceHeight={sourceHeight}
    />
  )
}

export default EvidenceImage
