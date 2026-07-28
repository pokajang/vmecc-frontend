import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormCheck } from '@coreui/react'
import EditControls from 'src/components/EditControls'
import { ROLE_OPTIONS } from 'src/constants/roles'
import ApprovalRulesEditor from './ApprovalRulesEditor'
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
  const [savedPolicy, setSavedPolicy] = useState(emptyPolicy)

  const [typeEditMode, setTypeEditMode] = useState(false)
  const [flowEditMode, setFlowEditMode] = useState(false)
  const [typeLoading, setTypeLoading] = useState(false)
  const [flowLoading, setFlowLoading] = useState(false)

  const [typeError, setTypeError] = useState(null)
  const [flowError, setFlowError] = useState(null)
  const [typeStatusMessage, setTypeStatusMessage] = useState(null)
  const [flowStatusMessage, setFlowStatusMessage] = useState(null)

  const [typeDraftVisibility, setTypeDraftVisibility] = useState(emptyPolicy.typeVisibility)
  const [flowDraftWorkflow, setFlowDraftWorkflow] = useState(emptyPolicy.workflow)

  const sortedRoles = useMemo(
    () => [...ROLE_SELECT_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  useEffect(() => {
    let alive = true

    const hydrate = async () => {
      setTypeLoading(true)
      setFlowLoading(true)
      const result = await loadOvertimeApprovalRules()
      if (!alive) return
      const normalized = normalizeOvertimeApprovalRules(result?.data)
      setSavedPolicy(normalized)
      setTypeDraftVisibility(normalized.typeVisibility)
      setFlowDraftWorkflow(normalized.workflow)
      setTypeLoading(false)
      setFlowLoading(false)
      if (!result?.ok) {
        setTypeError('Unable to load overtime type rules from API; showing defaults.')
        setFlowError('Unable to load overtime approval flow from API; showing defaults.')
      }
    }

    hydrate()

    return () => {
      alive = false
    }
  }, [])

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

  const handleTypeSave = async () => {
    if (!hasVisibleOvertimeType(typeDraftVisibility)) {
      setTypeError('Enable at least one overtime type for user application.')
      return
    }

    const normalized = normalizeOvertimeApprovalRules({
      ...savedPolicy,
      typeVisibility: typeDraftVisibility,
    })
    setTypeLoading(true)
    const result = await saveOvertimeApprovalRules(normalized)
    setTypeLoading(false)
    if (!result?.ok) {
      setTypeError('Unable to save overtime type rules.')
      return
    }

    const persisted = normalizeOvertimeApprovalRules(result.data)
    setSavedPolicy(persisted)
    setTypeDraftVisibility(persisted.typeVisibility)
    setFlowDraftWorkflow(persisted.workflow)
    setTypeEditMode(false)
    setTypeError(null)
    setTypeStatusMessage('Overtime type rules saved.')
    setTimeout(() => setTypeStatusMessage(null), 2500)
  }

  const handleFlowSave = async () => {
    const validationMessage = validateWorkflow(flowDraftWorkflow)
    if (validationMessage) {
      setFlowError(validationMessage)
      return
    }

    const normalized = normalizeOvertimeApprovalRules({
      ...savedPolicy,
      workflow: flowDraftWorkflow,
    })
    setFlowLoading(true)
    const result = await saveOvertimeApprovalRules(normalized)
    setFlowLoading(false)
    if (!result?.ok) {
      setFlowError('Unable to save overtime approval flow.')
      return
    }

    const persisted = normalizeOvertimeApprovalRules(result.data)
    setSavedPolicy(persisted)
    setFlowDraftWorkflow(persisted.workflow)
    setTypeDraftVisibility(persisted.typeVisibility)
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
            loading={typeLoading}
            onEdit={handleTypeEdit}
            onSave={handleTypeSave}
            onCancel={handleTypeCancel}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
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
              disabled={!typeEditMode || typeLoading}
            />
          ))}
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
          <span>Overtime Approval Flow</span>
          <EditControls
            editMode={flowEditMode}
            loading={flowLoading}
            onEdit={handleFlowEdit}
            onSave={handleFlowSave}
            onCancel={handleFlowCancel}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          <ApprovalRulesEditor
            title="Overtime Approval Flow"
            description="Configure role-based overtime workflow routing for review, recommendation, and final approval."
            editMode={flowEditMode}
            error={flowError}
            loading={flowLoading}
            policy={flowDraftWorkflow}
            setPolicy={setFlowDraftWorkflow}
            setFallbackField={setFallbackField}
            setOptionField={setOptionField}
            setRuleField={setRuleField}
            addRule={addRule}
            removeRule={removeRule}
            sortedRoles={sortedRoles}
            stageFields={STAGE_FIELDS}
            statusMessage={flowStatusMessage}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default OvertimeApprovalRules
