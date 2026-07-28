import React from 'react'
import {
  CButton,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'

const getStageOptions = (stageRoleOptions, stageKey, sortedRoles) =>
  stageRoleOptions?.[stageKey]?.length ? stageRoleOptions[stageKey] : sortedRoles

const applyPreset = ({ policy = {}, preset = '', stageFields = [] } = {}) => {
  const next = {
    ...policy,
    fallback: { ...(policy.fallback || {}) },
    options: { ...(policy.options || {}) },
    rules: Array.isArray(policy.rules) ? [...policy.rules] : [],
  }
  if (preset === 'single') {
    const finalStage = stageFields[stageFields.length - 1]
    const finalRole = next.fallback?.[finalStage?.key] || ''
    stageFields.forEach((stage) => {
      if (finalRole) next.fallback[stage.key] = finalRole
    })
    if ('requireRecommendation' in next.options) next.options.requireRecommendation = false
    return next
  }
  if (preset === 'review-approval') {
    if (stageFields.length >= 3) {
      const reviewRole = next.fallback?.[stageFields[0].key] || ''
      if (reviewRole) next.fallback[stageFields[1].key] = reviewRole
    }
    if ('requireRecommendation' in next.options) next.options.requireRecommendation = false
    return next
  }
  if (preset === 'three-stage') {
    if ('requireRecommendation' in next.options) next.options.requireRecommendation = true
    return next
  }
  return policy
}

const buildPreviewText = ({ fallback = {}, stageFields = [] } = {}) =>
  stageFields.map((stage) => `${stage.label}: ${fallback?.[stage.key] || '-'}`).join(' -> ')

const ApprovalRulesEditor = ({
  addRule,
  description,
  editMode = false,
  error = '',
  loading = false,
  policy = {},
  removeRule,
  setFallbackField,
  setOptionField,
  setPolicy,
  setRuleField,
  sortedRoles = [],
  stageFields = [],
  stageRoleOptions = {},
  statusMessage = '',
  title,
}) => {
  const hasRules = Array.isArray(policy?.rules)
  const canApplyPreset = editMode && !loading && typeof setPolicy === 'function'
  const previewText = buildPreviewText({ fallback: policy?.fallback, stageFields })

  const handlePreset = (preset) => {
    if (!canApplyPreset) return
    setPolicy(applyPreset({ policy, preset, stageFields }))
  }

  return (
    <div className="d-grid gap-3">
      {title ? <div className="fw-semibold">{title}</div> : null}
      {description ? <p className="text-muted mb-0">{description}</p> : null}
      {statusMessage ? <div className="text-success small">{statusMessage}</div> : null}
      {error ? <div className="text-danger small">{error}</div> : null}

      <div className="border rounded-3 p-3 d-grid gap-2">
        <div className="fw-semibold">Workflow Presets</div>
        <div className="small text-muted">Presets fill the fields. Save to apply.</div>
        <div className="d-flex flex-wrap gap-2">
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={!canApplyPreset}
            onClick={() => handlePreset('single')}
          >
            Single approver
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={!canApplyPreset}
            onClick={() => handlePreset('review-approval')}
          >
            Review plus approval
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={!canApplyPreset}
            onClick={() => handlePreset('three-stage')}
          >
            Three-stage approval
          </CButton>
        </div>
        <div className="small text-body-secondary">Preview: {previewText}</div>
      </div>

      {policy?.options ? (
        <div className="border rounded-3 p-3 d-grid gap-2">
          <div className="fw-semibold">Workflow Options</div>
          {'requireRecommendation' in policy.options ? (
            <CFormCheck
              id={`${title || 'approval'}-recommendation`}
              label="Require recommendation stage before final approval"
              checked={Boolean(policy.options.requireRecommendation)}
              onChange={(event) => setOptionField?.('requireRecommendation', event.target.checked)}
              disabled={!editMode || loading}
            />
          ) : null}
          {'enforceDistinctApprovers' in policy.options ? (
            <CFormCheck
              id={`${title || 'approval'}-distinct`}
              label={`Enforce distinct roles across ${stageFields.map((stage) => stage.label).join(', ')}`}
              checked={Boolean(policy.options.enforceDistinctApprovers)}
              onChange={(event) =>
                setOptionField?.('enforceDistinctApprovers', event.target.checked)
              }
              disabled={!editMode || loading}
            />
          ) : null}
        </div>
      ) : null}

      <div className="border rounded-3 p-3 d-grid gap-2">
        <div className="fw-semibold">Fallback rule</div>
        <div className="small text-muted">Used when no active role rule matches.</div>
        <div className="row g-2">
          {stageFields.map((stage) => (
            <div className="col-12 col-md-4" key={stage.key}>
              <CFormLabel htmlFor={`fallback-rule-${stage.key}`} className="small mb-1">
                {stage.label}
              </CFormLabel>
              <CFormSelect
                id={`fallback-rule-${stage.key}`}
                size="sm"
                value={policy?.fallback?.[stage.key] || ''}
                onChange={(event) => setFallbackField?.(stage.key, event.target.value)}
                disabled={!editMode || loading}
              >
                {getStageOptions(stageRoleOptions, stage.key, sortedRoles).map((option) => (
                  <option key={`fallback-${stage.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
          ))}
        </div>
      </div>

      {hasRules ? (
        <>
          <div className="d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Role-Based Rules</div>
            {editMode ? (
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={addRule}
                disabled={loading}
              >
                <Plus size={14} className="me-1" />
                Add Rule
              </CButton>
            ) : null}
          </div>
          <div className="rounded-3 border overflow-hidden">
            <CTable align="middle" className="mb-0" responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Applicant Role</CTableHeaderCell>
                  {stageFields.map((stage) => (
                    <CTableHeaderCell key={stage.key}>{stage.label}</CTableHeaderCell>
                  ))}
                  <CTableHeaderCell className="text-center">Active</CTableHeaderCell>
                  <CTableHeaderCell className="table-sticky-action-cell text-center">
                    Actions
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {policy.rules.map((rule) => (
                  <CTableRow key={rule.id}>
                    <CTableDataCell>
                      <CFormSelect
                        aria-label={`Applicant role for rule ${rule.id}`}
                        size="sm"
                        value={rule.applicantRole}
                        onChange={(event) =>
                          setRuleField?.(rule.id, 'applicantRole', event.target.value)
                        }
                        disabled={!editMode || loading}
                      >
                        <option value="">Select role</option>
                        {sortedRoles.map((option) => (
                          <option key={`${rule.id}-applicant-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                    {stageFields.map((stage) => (
                      <CTableDataCell key={`${rule.id}-${stage.key}`}>
                        <CFormSelect
                          aria-label={`${stage.label} role for rule ${rule.id}`}
                          size="sm"
                          value={rule[stage.key] || ''}
                          onChange={(event) =>
                            setRuleField?.(rule.id, stage.key, event.target.value)
                          }
                          disabled={!editMode || loading}
                        >
                          {getStageOptions(stageRoleOptions, stage.key, sortedRoles).map(
                            (option) => (
                              <option
                                key={`${rule.id}-${stage.key}-${option.value}`}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ),
                          )}
                        </CFormSelect>
                      </CTableDataCell>
                    ))}
                    <CTableDataCell className="text-center">
                      <CFormCheck
                        checked={rule.active !== false}
                        onChange={(event) =>
                          setRuleField?.(rule.id, 'active', event.target.checked)
                        }
                        disabled={!editMode || loading}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="table-sticky-action-cell text-center">
                      {editMode ? (
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          disabled={loading || policy.rules.length <= 1}
                          onClick={() => removeRule?.(rule.id)}
                        >
                          <Trash2 size={14} />
                        </CButton>
                      ) : (
                        <span className="text-body-secondary small">-</span>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default ApprovalRulesEditor
