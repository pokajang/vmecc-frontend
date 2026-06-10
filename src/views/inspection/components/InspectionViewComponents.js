import React from 'react'
import { CCard, CCardBody, CCol, CRow } from '@coreui/react'

export const DetailField = ({ label, children, xs = 6, md = 4 }) => (
  <CCol xs={xs} md={md}>
    <CRow className="g-2 align-items-start">
      <CCol xs={5} md={12}>
        <div className="small text-body-secondary">{label}</div>
      </CCol>
      <CCol xs={7} md={12}>
        <div>{children}</div>
      </CCol>
    </CRow>
  </CCol>
)

export const SectionHeading = ({ children }) => (
  <div className="fw-semibold border-bottom pb-2 mb-1">{children}</div>
)

export const PhotosGrid = ({ photos }) => {
  if (!photos?.length) return null
  return (
    <CRow className="g-2">
      <CCol xs={12}>
        <div className="fw-semibold mb-1">Uploaded Photos</div>
      </CCol>
      <CCol xs={12}>
        <CRow className="g-3">
          {photos.map((photo, i) => (
            <CCol key={photo.id || i} xs={12} sm={6} md={4} lg={3}>
              <CCard className="rounded-3 border border-light-subtle overflow-hidden h-100">
                <img
                  src={photo.url}
                  alt={photo.fileName || `Inspection photo ${i + 1}`}
                  style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                />
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
            <div className="fw-semibold">{finding.type || 'Untyped finding'}</div>
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
