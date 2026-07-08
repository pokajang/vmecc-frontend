import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormSelect,
  CRow,
} from '@coreui/react'
import EditControls from 'src/components/EditControls'
import { ROLE_OPTIONS } from 'src/constants/roles'

const DEFAULT_POLICY = {
  fallback: {
    reviewRole: 'Incident Commander',
    fallbackReviewRole: 'Incident Commander',
    approveRole: 'Incident Commander',
  },
  options: {
    useTeamScopedAic: true,
    allowSubmitWithoutTeam: true,
    allowIcFallbackReview: true,
    preventSelfReview: true,
    preventSelfApprove: true,
  },
}

const normalizePolicy = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  const fallback = source.fallback && typeof source.fallback === 'object' ? source.fallback : {}
  const options = source.options && typeof source.options === 'object' ? source.options : {}

  return {
    fallback: {
      reviewRole: fallback.reviewRole || DEFAULT_POLICY.fallback.reviewRole,
      fallbackReviewRole: fallback.fallbackReviewRole || DEFAULT_POLICY.fallback.fallbackReviewRole,
      approveRole: fallback.approveRole || DEFAULT_POLICY.fallback.approveRole,
    },
    options: {
      useTeamScopedAic: options.useTeamScopedAic !== false,
      allowSubmitWithoutTeam: options.allowSubmitWithoutTeam !== false,
      allowIcFallbackReview: options.allowIcFallbackReview !== false,
      preventSelfReview: options.preventSelfReview !== false,
      preventSelfApprove: options.preventSelfApprove !== false,
    },
  }
}

const roleOptions = ROLE_OPTIONS.map((role) => ({ value: role, label: role })).sort((a, b) =>
  a.label.localeCompare(b.label),
)

const FIELD_LABELS = [
  {
    key: 'reviewRole',
    label: 'Team Review Role',
    help: 'Used when an active same-team reviewer exists.',
  },
  {
    key: 'fallbackReviewRole',
    label: 'Fallback Review Role',
    help: 'Used when no same-team reviewer is available.',
  },
  {
    key: 'approveRole',
    label: 'Final Approval Role',
    help: 'Global final approver for this report type.',
  },
]

const OPTION_LABELS = [
  {
    key: 'useTeamScopedAic',
    label: 'Use same-team reviewer',
  },
  {
    key: 'allowSubmitWithoutTeam',
    label: 'Allow submission without a team',
  },
  {
    key: 'allowIcFallbackReview',
    label: 'Allow fallback review',
  },
  {
    key: 'preventSelfReview',
    label: 'Prevent submitter self-review',
  },
  {
    key: 'preventSelfApprove',
    label: 'Prevent submitter self-approval',
  },
]

const ReportingWorkflowRulesEditor = ({ moduleKey, moduleLabel, description, rules, onSave }) => {
  const normalizedRules = useMemo(() => normalizePolicy(rules), [rules])
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [savedPolicy, setSavedPolicy] = useState(normalizedRules)
  const [draftPolicy, setDraftPolicy] = useState(normalizedRules)

  useEffect(() => {
    setSavedPolicy(normalizedRules)
    setDraftPolicy(normalizedRules)
    setEditMode(false)
    setError('')
    setStatusMessage('')
  }, [moduleKey, normalizedRules])

  const setFallbackField = (field, value) => {
    setDraftPolicy((prev) => ({
      ...prev,
      fallback: {
        ...prev.fallback,
        [field]: value,
      },
    }))
  }

  const setOptionField = (field, value) => {
    setDraftPolicy((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [field]: Boolean(value),
      },
    }))
  }

  const validateDraft = () => {
    const roles = new Set(ROLE_OPTIONS)
    for (const field of FIELD_LABELS) {
      if (!roles.has(draftPolicy.fallback[field.key])) {
        return `${field.label} must be a valid role.`
      }
    }
    return ''
  }

  const handleSave = async () => {
    const validationMessage = validateDraft()
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setSaving(true)
    setError('')
    setStatusMessage('')
    try {
      const saved = normalizePolicy(await onSave?.(moduleKey, draftPolicy))
      setSavedPolicy(saved)
      setDraftPolicy(saved)
      setEditMode(false)
      setStatusMessage(`${moduleLabel} workflow rules saved.`)
      window.setTimeout(() => setStatusMessage(''), 2500)
    } catch (err) {
      setError(err?.message || `Unable to save ${moduleLabel.toLowerCase()} workflow rules.`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraftPolicy(savedPolicy)
    setEditMode(false)
    setError('')
    setStatusMessage('')
  }

  return (
    <CCard className="reporting-workflow-card mb-4">
      <CCardHeader className="reporting-workflow-card__header d-flex justify-content-between align-items-center gap-2">
        <span className="reporting-workflow-card__title">{moduleLabel} Workflow Rules</span>
        <EditControls
          editMode={editMode}
          loading={saving}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody className="reporting-workflow-card__body">
        <div className="reporting-workflow-card__content d-grid gap-3">
          {error ? <CAlert color="warning">{error}</CAlert> : null}
          {statusMessage ? <CAlert color="success">{statusMessage}</CAlert> : null}
          <div className="reporting-workflow-card__summary">
            <div className="fw-semibold">Submitter - Review - Approval</div>
            <div className="small text-body-secondary">{description}</div>
          </div>
          <CRow className="reporting-workflow-card__roles g-3">
            {FIELD_LABELS.map((field) => (
              <CCol xs={12} md={4} key={field.key}>
                <label
                  className="reporting-workflow-card__field-label form-label"
                  htmlFor={`${moduleKey}-workflow-${field.key}`}
                >
                  {field.label}
                </label>
                <CFormSelect
                  id={`${moduleKey}-workflow-${field.key}`}
                  className="reporting-workflow-card__select"
                  value={draftPolicy.fallback[field.key]}
                  disabled={!editMode || saving}
                  onChange={(event) => setFallbackField(field.key, event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </CFormSelect>
                <div className="reporting-workflow-card__help form-text">{field.help}</div>
              </CCol>
            ))}
          </CRow>
          <div className="reporting-workflow-card__options d-grid gap-2">
            {OPTION_LABELS.map((option) => (
              <CFormCheck
                key={option.key}
                id={`${moduleKey}-workflow-${option.key}`}
                className="reporting-workflow-card__option"
                label={option.label}
                checked={draftPolicy.options[option.key]}
                disabled={!editMode || saving}
                onChange={(event) => setOptionField(option.key, event.target.checked)}
              />
            ))}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export { normalizePolicy as normalizeReportingWorkflowPolicy }
export default ReportingWorkflowRulesEditor
