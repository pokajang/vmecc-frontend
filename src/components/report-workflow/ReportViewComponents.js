import React, { useState } from 'react'
import { CCol, CRow } from '@coreui/react'
import EvidencePhotoGallery from 'src/components/media/EvidencePhotoGallery'

export const resolvePhotoLabel = ({ photo, index = 0, contextLabel = 'Evidence photo' } = {}) => {
  const description = String(photo?.description || '').trim()
  if (description) return description
  const safeContext = String(contextLabel || '').trim() || 'Evidence photo'
  return `${safeContext} ${Number(index || 0) + 1}`
}

export const DetailField = ({ label, children, xs = 12, md = 4, mobileLayout = 'stacked' }) => (
  <CCol xs={xs} md={md}>
    <div
      className={[
        'workflow-detail-field',
        mobileLayout === 'inline' ? 'workflow-detail-field--mobile-inline' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="workflow-detail-field__label">{label}</div>
      <div className="workflow-detail-field__value">{children}</div>
    </div>
  </CCol>
)

export const SectionHeading = ({ children }) => (
  <div className="fw-semibold text-muted mb-1">{children}</div>
)

export const ReportPhotoImage = ({
  photo,
  alt = '',
  preferFullSize = false,
  onFinalError,
  onLoad,
  ...props
}) => {
  const { width: widthProp, height: heightProp, ...imageProps } = props
  const fullUrl = String(photo?.url || '')
  const thumbnailUrl = String(photo?.thumbnailUrl || photo?.thumbnail_url || '')
  const preferredUrl = preferFullSize ? fullUrl || thumbnailUrl : thumbnailUrl || fullUrl
  const fallbackUrl = preferFullSize ? thumbnailUrl : fullUrl
  const [failedPreferredUrl, setFailedPreferredUrl] = useState('')
  const canUseFallback = Boolean(fallbackUrl && fallbackUrl !== preferredUrl)
  const source =
    preferredUrl && failedPreferredUrl !== preferredUrl
      ? preferredUrl
      : canUseFallback
        ? fallbackUrl
        : ''
  const sourceWidth = Number(
    preferFullSize ? photo?.width : photo?.thumbnailWidth || photo?.thumbnail_width || photo?.width,
  )
  const sourceHeight = Number(
    preferFullSize
      ? photo?.height
      : photo?.thumbnailHeight || photo?.thumbnail_height || photo?.height,
  )

  if (!source) return null

  return (
    <img
      {...imageProps}
      alt={alt}
      src={source}
      width={widthProp ?? (sourceWidth > 0 ? sourceWidth : undefined)}
      height={heightProp ?? (sourceHeight > 0 ? sourceHeight : undefined)}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={() => {
        if (source === preferredUrl && canUseFallback) setFailedPreferredUrl(preferredUrl)
        else onFinalError?.()
      }}
    />
  )
}

export const PhotoPreview = ({
  photo,
  alt = 'Evidence photo',
  className = '',
  preferFullSize = false,
}) => {
  const fullUrl = String(photo?.url || '')
  const thumbnailUrl = String(photo?.thumbnailUrl || photo?.thumbnail_url || '')
  const sourceKey = `${fullUrl}\u0000${thumbnailUrl}`
  const [failedSourceKey, setFailedSourceKey] = useState('')
  const hasError = (!fullUrl && !thumbnailUrl) || failedSourceKey === sourceKey

  return (
    <div
      className={[
        'workflow-photo-preview',
        hasError ? 'workflow-photo-preview--missing' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hasError ? (
        <ReportPhotoImage
          photo={photo}
          preferFullSize={preferFullSize}
          alt={alt}
          className="workflow-photo-preview__image"
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth <= 2 && image.naturalHeight <= 2) {
              setFailedSourceKey(sourceKey)
            }
          }}
          onFinalError={() => setFailedSourceKey(sourceKey)}
        />
      ) : (
        <div className="workflow-photo-preview__fallback">Preview unavailable</div>
      )}
    </div>
  )
}

export const PhotosGrid = ({ photos }) => {
  if (!photos?.length) return null
  return (
    <div className="d-grid gap-2">
      <div className="fw-semibold text-muted">Uploaded Photos</div>
      <EvidencePhotoGallery
        photos={photos}
        title="Uploaded photos"
        contextLabel="Resolution evidence"
      />
    </div>
  )
}

export const FindingsList = ({ findings }) => {
  if (!findings?.length) return null
  return (
    <div className="d-grid gap-2">
      <SectionHeading>Findings</SectionHeading>
      <div className="d-grid gap-2">
        {findings.map((finding, index) => (
          <div
            key={`${finding.photoId || finding.type || 'finding'}-${index}`}
            className="rounded-3 border border-light-subtle p-3"
          >
            <div className="fw-semibold text-muted">{finding.type || 'Untyped finding'}</div>
            {finding.location ? (
              <div className="text-body-secondary small mt-1">{finding.location}</div>
            ) : null}
            {finding.description ? (
              <div className="text-body-secondary small mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                {finding.description}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
