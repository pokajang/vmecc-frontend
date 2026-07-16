import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { formatBytes, truncate } from './helpers'

const AiHelperKnowledgeDiagnosticsCard = ({
  diagnostics = null,
  diagnosticsError = null,
  diagnosticsLoading = false,
  onRefresh = () => {},
}) => (
  <CCard className="mb-4" data-testid="ai-helper-knowledge-diagnostics">
    <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <span>Ask AI Diagnostics</span>
      <CButton
        size="sm"
        color="secondary"
        variant="outline"
        onClick={onRefresh}
        disabled={diagnosticsLoading}
      >
        {diagnosticsLoading ? 'Refreshing...' : 'Refresh'}
      </CButton>
    </CCardHeader>
    <CCardBody>
      {diagnosticsError ? <CAlert color="danger">{diagnosticsError}</CAlert> : null}

      {diagnostics ? (
        <>
          <div className="small text-body-secondary mb-3">
            Operational status for Ask AI configuration, queue, storage, and failed processing.
          </div>

          <CRow className="g-3 mb-3">
            <CCol md={3} sm={6}>
              <div className="small text-body-secondary mb-1">Feature</div>
              <CBadge color={diagnostics.enabled ? 'success' : 'secondary'}>
                {diagnostics.enabled ? 'Enabled' : 'Disabled'}
              </CBadge>
            </CCol>
            <CCol md={3} sm={6}>
              <div className="small text-body-secondary mb-1">Provider config</div>
              <CBadge color={diagnostics.configured ? 'success' : 'warning'}>
                {diagnostics.configured ? 'Configured' : 'Missing'}
              </CBadge>
            </CCol>
            <CCol md={3} sm={6}>
              <div className="small text-body-secondary mb-1">Queue</div>
              <div>{diagnostics.queue?.default_connection || 'Unknown'}</div>
            </CCol>
            <CCol md={3} sm={6}>
              <div className="small text-body-secondary mb-1">Storage</div>
              <div>
                {formatBytes(diagnostics.storage?.knowledge_used_bytes)}
                {diagnostics.storage?.knowledge_max_total_bytes
                  ? ` / ${formatBytes(diagnostics.storage.knowledge_max_total_bytes)}`
                  : ''}
              </div>
            </CCol>
          </CRow>

          {(diagnostics.recent_failed_uploads || []).length ? (
            <div className="border rounded-3 p-3 bg-light">
              <div className="fw-semibold mb-2">Recent failed uploads</div>
              <div className="d-grid gap-2">
                {diagnostics.recent_failed_uploads.map((item) => (
                  <div key={item.id}>
                    <div className="fw-semibold text-break">
                      {item.source_filename || item.title}
                    </div>
                    <div className="small text-body-secondary text-break">
                      {truncate(item.error, 180)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="small text-body-secondary">No recent failed uploads.</div>
          )}
        </>
      ) : diagnosticsLoading ? (
        <div className="small text-body-secondary">Loading diagnostics...</div>
      ) : null}
    </CCardBody>
  </CCard>
)

export default AiHelperKnowledgeDiagnosticsCard
