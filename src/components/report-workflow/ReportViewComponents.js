import React, { useState } from 'react'
import { CCard, CCardBody, CCol, CRow } from '@coreui/react'

export const DetailField = ({ label, children, xs = 12, md = 4 }) => (
  <CCol xs={xs} md={md}>
    <div className="workflow-detail-field">
      <div className="workflow-detail-field__label">{label}</div>
      <div className="workflow-detail-field__value">{children}</div>
    </div>
  </CCol>
)

export const SectionHeading = ({ children }) => (
  <div className="fw-semibold text-muted border-bottom pb-2 mb-1">{children}</div>
)

export const ReportPhotoImage = ({
  photo,
  preferFullSize = false,
  onFinalError,
  onLoad,
  ...props
}) => {
  const fullUrl = String(photo?.url || '')
  const previewUrl = preferFullSize
    ? fullUrl
    : String(photo?.thumbnailUrl || photo?.thumbnail_url || fullUrl)
  const [failedPreviewUrl, setFailedPreviewUrl] = useState('')
  const source = previewUrl && failedPreviewUrl !== previewUrl ? previewUrl : fullUrl

  if (!source) return null

  return (
    <img
      {...props}
      src={source}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={() => {
        if (source !== fullUrl && fullUrl) setFailedPreviewUrl(previewUrl)
        else onFinalError?.()
      }}
    />
  )
}

export const PhotoPreview = ({ photo, alt = 'Inspection photo', className = '' }) => {
  const [hasError, setHasError] = useState(!photo?.url)

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
          alt={photo.fileName || alt}
          className="workflow-photo-preview__image"
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth <= 2 && image.naturalHeight <= 2) setHasError(true)
          }}
          onFinalError={() => setHasError(true)}
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
    <CRow className="g-2">
      <CCol xs={12}>
        <div className="fw-semibold text-muted mb-1">Uploaded Photos</div>
      </CCol>
      <CCol xs={12}>
        <CRow className="g-3">
          {photos.map((photo, i) => (
            <CCol key={photo.id || i} xs={12} sm={6} md={4} lg={3}>
              <CCard className="rounded-3 border border-light-subtle overflow-hidden h-100">
                <PhotoPreview photo={photo} alt={`Inspection photo ${i + 1}`} />
                <CCardBody className="p-2">
                  {photo.fileName ? (
                    <div className="small text-body-secondary">{photo.fileName}</div>
                  ) : null}
                  {String(photo.description || '').trim() ? (
                    <div
                      className="small text-body-secondary mt-1"
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {photo.description}
                    </div>
                  ) : null}
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      </CCol>
    </CRow>
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
