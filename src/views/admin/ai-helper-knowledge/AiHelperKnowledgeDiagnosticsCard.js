import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { formatBytes, truncate } from './helpers'

const semanticStatus = (ready) => {
  if (ready === true) {
    return { color: 'success', label: 'Ready' }
  }

  if (ready === false) {
    return { color: 'danger', label: 'Needs rebuild' }
  }

  return { color: 'secondary', label: 'Unknown' }
}

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

          <div className="border rounded-3 p-3 mb-3">
            <div className="fw-semibold mb-2">Provider runtime</div>
            <CRow className="g-3 small">
              <CCol md={4} sm={6}>
                <div className="text-body-secondary">API version</div>
                <div>{diagnostics.provider?.api_version || 'Unknown'}</div>
              </CCol>
              <CCol md={4} sm={6}>
                <div className="text-body-secondary">Primary model</div>
                <div className="font-monospace text-break" data-testid="ai-helper-primary-model">
                  {diagnostics.provider?.primary_model || 'Not configured'}
                </div>
              </CCol>
              <CCol md={4} sm={6}>
                <div className="text-body-secondary">Embedding model</div>
                <div className="font-monospace text-break" data-testid="ai-helper-embedding-model">
                  {diagnostics.provider?.embedding_model || 'Not configured'}
                </div>
              </CCol>
            </CRow>
          </div>

          <div className="border rounded-3 p-3 mb-3">
            <div className="fw-semibold mb-2">Answer reliability</div>
            <CRow className="g-3 small">
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Retrieval pipeline</div>
                <div>v{diagnostics.knowledge_runtime?.retrieval_pipeline_version || 2}</div>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Reranking</div>
                <div>{diagnostics.knowledge_runtime?.rerank_enabled ? 'Enabled' : 'Disabled'}</div>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Critical fact checks</div>
                <div>
                  {diagnostics.knowledge_runtime?.critical_fact_validation_enabled
                    ? 'Enabled'
                    : 'Disabled'}
                </div>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Grounding verifier</div>
                <div>
                  {diagnostics.knowledge_runtime?.grounding_verification_mode || 'disabled'}
                </div>
              </CCol>
            </CRow>
            <hr className="my-3" />
            <CRow className="g-3 small">
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Semantic index</div>
                <CBadge
                  color={semanticStatus(diagnostics.knowledge_runtime?.semantic_ready).color}
                  data-testid="ai-helper-semantic-status"
                >
                  {semanticStatus(diagnostics.knowledge_runtime?.semantic_ready).label}
                </CBadge>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Compatible sources</div>
                <div data-testid="ai-helper-semantic-source-count">
                  {diagnostics.knowledge_runtime?.semantic_sources ?? 0} /{' '}
                  {diagnostics.knowledge_runtime?.usable_sources ?? 0}
                </div>
                <div className="text-body-secondary">
                  {diagnostics.knowledge_runtime?.incompatible_semantic_sources ?? 0} incompatible
                </div>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Missing chunk vectors</div>
                <div>{diagnostics.knowledge_runtime?.missing_embeddings ?? 0}</div>
              </CCol>
              <CCol md={3} sm={6}>
                <div className="text-body-secondary">Index fingerprint</div>
                <div
                  className="font-monospace text-break"
                  data-testid="ai-helper-index-fingerprint"
                >
                  {diagnostics.knowledge_runtime?.index_fingerprint || 'Not available'}
                </div>
              </CCol>
            </CRow>
          </div>

          {diagnostics.reliability?.sample_size ? (
            <div className="border rounded-3 p-3 mb-3">
              <div className="fw-semibold mb-2">Recent verified responses</div>
              <div className="small text-body-secondary">
                {diagnostics.reliability.verified} verified, {diagnostics.reliability.repaired}{' '}
                repaired, {diagnostics.reliability.rejected} rejected from the latest{' '}
                {diagnostics.reliability.sample_size} responses. P95 response time:{' '}
                {diagnostics.reliability.p95_response_ms
                  ? `${diagnostics.reliability.p95_response_ms} ms`
                  : 'not available'}
                .
              </div>
            </div>
          ) : null}

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
