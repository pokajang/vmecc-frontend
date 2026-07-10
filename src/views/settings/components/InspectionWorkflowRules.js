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
import TableLoader from 'src/components/TableLoader'
import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  fetchInspectionWorkflowRules,
  saveInspectionWorkflowRules,
} from 'src/services/api/settingsApi'

const DEFAULT_POLICY = {
  fallback: {
    reviewRole: 'Assistant Incident Commander',
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
    help: 'Used when no team AIC is available.',
  },
  {
    key: 'approveRole',
    label: 'Final Approval Role',
    help: 'Global final approver for inspections.',
  },
]

const OPTION_LABELS = [
  {
    key: 'useTeamScopedAic',
    label: 'Use same-team AIC for review',
  },
  {
    key: 'allowSubmitWithoutTeam',
    label: 'Allow submission without a team',
  },
  {
    key: 'allowIcFallbackReview',
    label: 'Allow IC fallback review',
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

const InspectionWorkflowRules = () => {
  const initialPolicy = useMemo(() => normalizePolicy(DEFAULT_POLICY), [])
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [savedPolicy, setSavedPolicy] = useState(initialPolicy)
  const [draftPolicy, setDraftPolicy] = useState(initialPolicy)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchInspectionWorkflowRules()
        if (!alive) return
        const normalized = normalizePolicy(response?.data)
        setSavedPolicy(normalized)
        setDraftPolicy(normalized)
      } catch (err) {
        if (!alive) return
        setError(err?.message || 'Unable to load inspection workflow rules.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

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
      const response = await saveInspectionWorkflowRules(draftPolicy)
      const normalized = normalizePolicy(response?.data)
      setSavedPolicy(normalized)
      setDraftPolicy(normalized)
      setEditMode(false)
      setStatusMessage('Inspection workflow rules saved.')
      window.setTimeout(() => setStatusMessage(''), 2500)
    } catch (err) {
      setError(err?.message || 'Unable to save inspection workflow rules.')
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
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <span>Inspection Workflow Rules</span>
        <EditControls
          editMode={editMode}
          loading={loading || saving}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <TableLoader message="Loading inspection workflow rules..." minHeight={160} />
        ) : (
          <div className="d-grid gap-3">
            {error ? <CAlert color="warning">{error}</CAlert> : null}
            {statusMessage ? <CAlert color="success">{statusMessage}</CAlert> : null}
            <div>
              <div className="fw-semibold">TRT - AIC Review - IC Approval</div>
              <div className="small text-body-secondary">
                Inspection submitters cannot review or approve their own records. Same-team AICs
                review when available; IC is the fallback reviewer and final approver.
              </div>
            </div>
            <CRow className="g-3">
              {FIELD_LABELS.map((field) => (
                <CCol xs={12} md={4} key={field.key}>
                  <label htmlFor={`inspection-workflow-role-${field.key}`} className="form-label">
                    {field.label}
                  </label>
                  <CFormSelect
                    id={`inspection-workflow-role-${field.key}`}
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
                  <div className="form-text">{field.help}</div>
                </CCol>
              ))}
            </CRow>
            <div className="d-grid gap-2">
              {OPTION_LABELS.map((option) => (
                <CFormCheck
                  key={option.key}
                  id={`inspection-workflow-${option.key}`}
                  label={option.label}
                  checked={draftPolicy.options[option.key]}
                  disabled={!editMode || saving}
                  onChange={(event) => setOptionField(option.key, event.target.checked)}
                />
              ))}
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default InspectionWorkflowRules
