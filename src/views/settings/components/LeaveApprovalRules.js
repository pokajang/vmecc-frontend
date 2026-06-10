import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
import EditControls from 'src/components/EditControls'
import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  DEFAULT_LEAVE_APPROVAL_RULES,
  loadLeaveApprovalRules,
  normalizeLeaveApprovalRules,
  saveLeaveApprovalRules,
} from '../leaveApprovalRulesStorage'

const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map((role) => ({ value: role, label: role }))

const STAGE_FIELDS = [
  { key: 'reviewRole', label: 'Review' },
  { key: 'recommendRole', label: 'Recommend' },
  { key: 'approveRole', label: 'Approve' },
]

const createEmptyRule = (seed = Date.now()) => ({
  id: `leave-rule-${seed}-${Math.random().toString(36).slice(2, 7)}`,
  applicantRole: '',
  reviewRole: DEFAULT_LEAVE_APPROVAL_RULES.fallback.reviewRole,
  recommendRole: DEFAULT_LEAVE_APPROVAL_RULES.fallback.recommendRole,
  approveRole: DEFAULT_LEAVE_APPROVAL_RULES.fallback.approveRole,
  active: true,
})

const LeaveApprovalRules = () => {
  const emptyPolicy = useMemo(() => normalizeLeaveApprovalRules(null), [])
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [savedPolicy, setSavedPolicy] = useState(emptyPolicy)
  const [draftPolicy, setDraftPolicy] = useState(emptyPolicy)

  useEffect(() => {
    let mounted = true
    loadLeaveApprovalRules().then((result) => {
      if (!mounted) return
      const policy = normalizeLeaveApprovalRules(result?.data)
      setSavedPolicy(policy)
      setDraftPolicy(policy)
      setLoading(false)
      if (!result?.ok) {
        setError('Unable to load leave approval rules.')
      }
    }).catch(() => {
      if (!mounted) return
      setLoading(false)
      setError('Unable to load leave approval rules.')
    })
    return () => { mounted = false }
  }, [])

  const sortedRoles = useMemo(
    () => [...ROLE_SELECT_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  const validateDraftPolicy = (policy) => {
    if (
      !policy?.fallback?.reviewRole ||
      !policy?.fallback?.recommendRole ||
      !policy?.fallback?.approveRole
    ) {
      return 'Fallback rule must define Review, Recommend, and Approve roles.'
    }

    const activeRules = (Array.isArray(policy?.rules) ? policy.rules : []).filter(
      (row) => row?.active !== false,
    )
    const roleSet = new Set()

    for (let index = 0; index < activeRules.length; index += 1) {
      const rule = activeRules[index]
      if (!rule.applicantRole) {
        return `Active rule #${index + 1} must set an applicant role.`
      }
      if (roleSet.has(rule.applicantRole)) {
        return `Duplicate applicant role "${rule.applicantRole}" found in active rules.`
      }
      roleSet.add(rule.applicantRole)

      for (let stageIndex = 0; stageIndex < STAGE_FIELDS.length; stageIndex += 1) {
        const stage = STAGE_FIELDS[stageIndex]
        if (!rule[stage.key]) {
          return `Rule for ${rule.applicantRole} must set ${stage.label}.`
        }
      }

      if (policy?.options?.enforceDistinctApprovers) {
        const distinctRoles = new Set([rule.reviewRole, rule.recommendRole, rule.approveRole])
        if (distinctRoles.size !== 3) {
          return `Rule for ${rule.applicantRole} must use three distinct roles when distinct approvers is enabled.`
        }
      }
    }

    return null
  }

  const setRuleField = (ruleId, field, value) => {
    setDraftPolicy((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === ruleId ? { ...rule, [field]: value } : rule)),
    }))
  }

  const addRule = () => {
    setDraftPolicy((prev) => ({
      ...prev,
      rules: [...prev.rules, createEmptyRule()],
    }))
  }

  const removeRule = (ruleId) => {
    setDraftPolicy((prev) => ({
      ...prev,
      rules: prev.rules.filter((rule) => rule.id !== ruleId),
    }))
  }

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
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    const validationMessage = validateDraftPolicy(draftPolicy)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await saveLeaveApprovalRules(draftPolicy)
      const normalized = normalizeLeaveApprovalRules(result?.data)
      setSavedPolicy(normalized)
      setDraftPolicy(normalized)
      setEditMode(false)
      setStatusMessage('Leave approval rules saved.')
      setTimeout(() => setStatusMessage(null), 2500)
    } catch {
      setError('Unable to save leave approval rules.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setDraftPolicy(savedPolicy)
    setEditMode(false)
    setError(null)
    setStatusMessage(null)
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <span>Leave Approval Rules</span>
        <EditControls
          editMode={editMode}
          loading={loading}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <p className="text-muted mb-0">
          Configure dynamic workflow routing by applicant role. These rules define who reviews,
          recommends, and provides final approval for leave submissions.
        </p>

        {statusMessage ? <div className="text-success small">{statusMessage}</div> : null}
        {error ? <div className="text-danger small">{error}</div> : null}

        <div className="border rounded-3 p-3 d-grid gap-2">
          <div className="fw-semibold">Workflow Options</div>
          <CFormCheck
            id="leave-approval-recommendation"
            label="Require recommendation stage before final approval"
            checked={Boolean(draftPolicy?.options?.requireRecommendation)}
            onChange={(event) => setOptionField('requireRecommendation', event.target.checked)}
            disabled={!editMode || loading}
          />
          <CFormCheck
            id="leave-approval-distinct"
            label="Enforce distinct roles across Review, Recommend, and Approve"
            checked={Boolean(draftPolicy?.options?.enforceDistinctApprovers)}
            onChange={(event) => setOptionField('enforceDistinctApprovers', event.target.checked)}
            disabled={!editMode || loading}
          />
        </div>

        <div className="border rounded-3 p-3 d-grid gap-2">
          <div className="fw-semibold">Fallback Rule</div>
          <div className="small text-muted">
            Used when applicant role does not match any active rule.
          </div>
          <div className="row g-2">
            {STAGE_FIELDS.map((stage) => (
              <div className="col-12 col-md-4" key={stage.key}>
                <CFormLabel className="small mb-1">{stage.label}</CFormLabel>
                <CFormSelect
                  size="sm"
                  value={draftPolicy?.fallback?.[stage.key] || ''}
                  onChange={(event) => setFallbackField(stage.key, event.target.value)}
                  disabled={!editMode || loading}
                >
                  {sortedRoles.map((option) => (
                    <option key={`fallback-${stage.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            ))}
          </div>
        </div>

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
                <CTableHeaderCell>Review</CTableHeaderCell>
                <CTableHeaderCell>Recommend</CTableHeaderCell>
                <CTableHeaderCell>Approve</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Active</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {draftPolicy.rules.map((rule) => (
                <CTableRow key={rule.id}>
                  <CTableDataCell>
                    <CFormSelect
                      size="sm"
                      value={rule.applicantRole}
                      onChange={(event) =>
                        setRuleField(rule.id, 'applicantRole', event.target.value)
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
                  {STAGE_FIELDS.map((stage) => (
                    <CTableDataCell key={`${rule.id}-${stage.key}`}>
                      <CFormSelect
                        size="sm"
                        value={rule[stage.key] || ''}
                        onChange={(event) => setRuleField(rule.id, stage.key, event.target.value)}
                        disabled={!editMode || loading}
                      >
                        {sortedRoles.map((option) => (
                          <option
                            key={`${rule.id}-${stage.key}-${option.value}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                  ))}
                  <CTableDataCell className="text-center">
                    <CFormCheck
                      checked={rule.active !== false}
                      onChange={(event) => setRuleField(rule.id, 'active', event.target.checked)}
                      disabled={!editMode || loading}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {editMode ? (
                      <CButton
                        size="sm"
                        color="danger"
                        variant="outline"
                        disabled={loading || draftPolicy.rules.length <= 1}
                        onClick={() => removeRule(rule.id)}
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
      </CCardBody>
    </CCard>
  )
}

export default LeaveApprovalRules
