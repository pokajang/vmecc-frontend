import React, { useMemo, useState } from 'react'
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
  DEFAULT_OVERTIME_APPROVAL_RULES,
  OVERTIME_TYPE_OPTIONS,
  hasVisibleOvertimeType,
  loadOvertimeApprovalRules,
  normalizeOvertimeApprovalRules,
  saveOvertimeApprovalRules,
} from '../overtimeApprovalRulesStorage'

const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map((role) => ({ value: role, label: role }))

const STAGE_FIELDS = [
  { key: 'reviewRole', label: 'Review' },
  { key: 'recommendRole', label: 'Recommend' },
  { key: 'approveRole', label: 'Approve' },
]

const createEmptyRule = (seed = Date.now()) => ({
  id: `ot-rule-${seed}-${Math.random().toString(36).slice(2, 7)}`,
  applicantRole: '',
  reviewRole: DEFAULT_OVERTIME_APPROVAL_RULES.workflow.fallback.reviewRole,
  recommendRole: DEFAULT_OVERTIME_APPROVAL_RULES.workflow.fallback.recommendRole,
  approveRole: DEFAULT_OVERTIME_APPROVAL_RULES.workflow.fallback.approveRole,
  active: true,
})

const OvertimeApprovalRules = () => {
  const emptyPolicy = useMemo(() => normalizeOvertimeApprovalRules(null), [])
  const [savedPolicy, setSavedPolicy] = useState(() => loadOvertimeApprovalRules())

  const [typeEditMode, setTypeEditMode] = useState(false)
  const [flowEditMode, setFlowEditMode] = useState(false)

  const [typeError, setTypeError] = useState(null)
  const [flowError, setFlowError] = useState(null)
  const [typeStatusMessage, setTypeStatusMessage] = useState(null)
  const [flowStatusMessage, setFlowStatusMessage] = useState(null)

  const [typeDraftVisibility, setTypeDraftVisibility] = useState(
    () => loadOvertimeApprovalRules()?.typeVisibility || emptyPolicy.typeVisibility,
  )
  const [flowDraftWorkflow, setFlowDraftWorkflow] = useState(
    () => loadOvertimeApprovalRules()?.workflow || emptyPolicy.workflow,
  )

  const sortedRoles = useMemo(
    () => [...ROLE_SELECT_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  const validateWorkflow = (workflow) => {
    const workflowPolicy = workflow || emptyPolicy.workflow
    if (
      !workflowPolicy?.fallback?.reviewRole ||
      !workflowPolicy?.fallback?.recommendRole ||
      !workflowPolicy?.fallback?.approveRole
    ) {
      return 'Fallback rule must define Review, Recommend, and Approve roles.'
    }

    const activeRules = (Array.isArray(workflowPolicy?.rules) ? workflowPolicy.rules : []).filter(
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

      if (workflowPolicy?.options?.enforceDistinctApprovers) {
        const distinctRoles = new Set([rule.reviewRole, rule.recommendRole, rule.approveRole])
        if (distinctRoles.size !== 3) {
          return `Rule for ${rule.applicantRole} must use three distinct roles when distinct approvers is enabled.`
        }
      }
    }

    return null
  }

  const setRuleField = (ruleId, field, value) => {
    setFlowDraftWorkflow((prev) => ({
      ...prev,
      rules: (prev?.rules || []).map((rule) =>
        rule.id === ruleId ? { ...rule, [field]: value } : rule,
      ),
    }))
  }

  const addRule = () => {
    setFlowDraftWorkflow((prev) => ({
      ...prev,
      rules: [...(prev?.rules || []), createEmptyRule()],
    }))
  }

  const removeRule = (ruleId) => {
    setFlowDraftWorkflow((prev) => ({
      ...prev,
      rules: (prev?.rules || []).filter((rule) => rule.id !== ruleId),
    }))
  }

  const setFallbackField = (field, value) => {
    setFlowDraftWorkflow((prev) => ({
      ...prev,
      fallback: {
        ...prev?.fallback,
        [field]: value,
      },
    }))
  }

  const setOptionField = (field, value) => {
    setFlowDraftWorkflow((prev) => ({
      ...prev,
      options: {
        ...prev?.options,
        [field]: value,
      },
    }))
  }

  const setTypeVisibilityField = (field, value) => {
    setTypeDraftVisibility((prev) => ({
      ...prev,
      [field]: Boolean(value),
    }))
  }

  const handleTypeEdit = () => {
    setFlowEditMode(false)
    setFlowDraftWorkflow(savedPolicy?.workflow || emptyPolicy.workflow)
    setFlowError(null)
    setFlowStatusMessage(null)

    setTypeDraftVisibility(savedPolicy?.typeVisibility || emptyPolicy.typeVisibility)
    setTypeEditMode(true)
    setTypeError(null)
    setTypeStatusMessage(null)
  }

  const handleFlowEdit = () => {
    setTypeEditMode(false)
    setTypeDraftVisibility(savedPolicy?.typeVisibility || emptyPolicy.typeVisibility)
    setTypeError(null)
    setTypeStatusMessage(null)

    setFlowDraftWorkflow(savedPolicy?.workflow || emptyPolicy.workflow)
    setFlowEditMode(true)
    setFlowError(null)
    setFlowStatusMessage(null)
  }

  const handleTypeSave = () => {
    if (!hasVisibleOvertimeType(typeDraftVisibility)) {
      setTypeError('Enable at least one overtime type for user application.')
      return
    }

    const normalized = normalizeOvertimeApprovalRules({
      ...savedPolicy,
      typeVisibility: typeDraftVisibility,
    })
    const ok = saveOvertimeApprovalRules(normalized)
    if (!ok) {
      setTypeError('Unable to save overtime type rules.')
      return
    }

    setSavedPolicy(normalized)
    setTypeDraftVisibility(normalized.typeVisibility)
    setFlowDraftWorkflow(normalized.workflow)
    setTypeEditMode(false)
    setTypeError(null)
    setTypeStatusMessage('Overtime type rules saved.')
    setTimeout(() => setTypeStatusMessage(null), 2500)
  }

  const handleFlowSave = () => {
    const validationMessage = validateWorkflow(flowDraftWorkflow)
    if (validationMessage) {
      setFlowError(validationMessage)
      return
    }

    const normalized = normalizeOvertimeApprovalRules({
      ...savedPolicy,
      workflow: flowDraftWorkflow,
    })
    const ok = saveOvertimeApprovalRules(normalized)
    if (!ok) {
      setFlowError('Unable to save overtime approval flow.')
      return
    }

    setSavedPolicy(normalized)
    setFlowDraftWorkflow(normalized.workflow)
    setTypeDraftVisibility(normalized.typeVisibility)
    setFlowEditMode(false)
    setFlowError(null)
    setFlowStatusMessage('Overtime approval flow saved.')
    setTimeout(() => setFlowStatusMessage(null), 2500)
  }

  const handleTypeCancel = () => {
    setTypeDraftVisibility(savedPolicy?.typeVisibility || emptyPolicy.typeVisibility)
    setTypeEditMode(false)
    setTypeError(null)
    setTypeStatusMessage(null)
  }

  const handleFlowCancel = () => {
    setFlowDraftWorkflow(savedPolicy?.workflow || emptyPolicy.workflow)
    setFlowEditMode(false)
    setFlowError(null)
    setFlowStatusMessage(null)
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
          <span>Overtime Type Rules</span>
          <EditControls
            editMode={typeEditMode}
            loading={false}
            onEdit={handleTypeEdit}
            onSave={handleTypeSave}
            onCancel={handleTypeCancel}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          <p className="text-muted mb-0">
            Configure which overtime types applicants can choose during overtime application.
          </p>
          {typeStatusMessage ? <div className="text-success small">{typeStatusMessage}</div> : null}
          {typeError ? <div className="text-danger small">{typeError}</div> : null}

          <div className="fw-semibold">Overtime Type Visibility</div>
          {OVERTIME_TYPE_OPTIONS.map((option) => (
            <CFormCheck
              key={option.value}
              id={`ot-type-visible-${option.value}`}
              label={`${option.title} - ${option.description}`}
              checked={Boolean(typeDraftVisibility?.[option.value])}
              onChange={(event) => setTypeVisibilityField(option.value, event.target.checked)}
              disabled={!typeEditMode}
            />
          ))}
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
          <span>Overtime Approval Flow</span>
          <EditControls
            editMode={flowEditMode}
            loading={false}
            onEdit={handleFlowEdit}
            onSave={handleFlowSave}
            onCancel={handleFlowCancel}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          <p className="text-muted mb-0">
            Configure role-based overtime workflow routing for review, recommendation, and final
            approval.
          </p>
          {flowStatusMessage ? <div className="text-success small">{flowStatusMessage}</div> : null}
          {flowError ? <div className="text-danger small">{flowError}</div> : null}

          <div className="fw-semibold">Workflow Options</div>
          <CFormCheck
            id="ot-approval-recommendation"
            label="Require recommendation stage before final approval"
            checked={Boolean(flowDraftWorkflow?.options?.requireRecommendation)}
            onChange={(event) => setOptionField('requireRecommendation', event.target.checked)}
            disabled={!flowEditMode}
          />
          <CFormCheck
            id="ot-approval-distinct"
            label="Enforce distinct roles across Review, Recommend, and Approve"
            checked={Boolean(flowDraftWorkflow?.options?.enforceDistinctApprovers)}
            onChange={(event) => setOptionField('enforceDistinctApprovers', event.target.checked)}
            disabled={!flowEditMode}
          />

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
                  value={flowDraftWorkflow?.fallback?.[stage.key] || ''}
                  onChange={(event) => setFallbackField(stage.key, event.target.value)}
                  disabled={!flowEditMode}
                >
                  {sortedRoles.map((option) => (
                    <option key={`ot-fallback-${stage.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Role-Based Rules</div>
            {flowEditMode ? (
              <CButton size="sm" color="secondary" variant="outline" onClick={addRule}>
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
                {(flowDraftWorkflow?.rules || []).map((rule) => (
                  <CTableRow key={rule.id}>
                    <CTableDataCell>
                      <CFormSelect
                        size="sm"
                        value={rule.applicantRole}
                        onChange={(event) =>
                          setRuleField(rule.id, 'applicantRole', event.target.value)
                        }
                        disabled={!flowEditMode}
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
                          disabled={!flowEditMode}
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
                        disabled={!flowEditMode}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      {flowEditMode ? (
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          disabled={(flowDraftWorkflow?.rules || []).length <= 1}
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
    </>
  )
}

export default OvertimeApprovalRules
