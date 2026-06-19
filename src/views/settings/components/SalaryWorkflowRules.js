import React, { useEffect, useMemo, useState } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import EditControls from 'src/components/EditControls'
import { ROLE_OPTIONS } from 'src/constants/roles'
import ApprovalRulesEditor from './ApprovalRulesEditor'
import {
  DEFAULT_SALARY_WORKFLOW_RULES,
  loadSalaryWorkflowRules,
  normalizeSalaryWorkflowRules,
  SALARY_WORKFLOW_STAGE_ALLOWED_ROLES,
  saveSalaryWorkflowRules,
} from '../salaryWorkflowStorage'

const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map((role) => ({ value: role, label: role }))

const STAGE_FIELDS = [
  { key: 'checkRole', label: 'Check' },
  { key: 'reviewRole', label: 'Review' },
  { key: 'approveRole', label: 'Approve' },
]

const SalaryWorkflowRules = () => {
  const initialPolicy = useMemo(
    () => normalizeSalaryWorkflowRules(DEFAULT_SALARY_WORKFLOW_RULES),
    [],
  )
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [savedPolicy, setSavedPolicy] = useState(initialPolicy)
  const [draftPolicy, setDraftPolicy] = useState(initialPolicy)

  const sortedRoles = useMemo(
    () => [...ROLE_SELECT_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  const stageRoleOptions = useMemo(
    () =>
      STAGE_FIELDS.reduce((map, stage) => {
        const allowed = SALARY_WORKFLOW_STAGE_ALLOWED_ROLES[stage.key] || []
        map[stage.key] = sortedRoles.filter((role) => allowed.includes(role.value))
        return map
      }, {}),
    [sortedRoles],
  )

  useEffect(() => {
    let alive = true

    const hydrate = async () => {
      setLoading(true)
      const result = await loadSalaryWorkflowRules()
      if (!alive) return
      const normalized = normalizeSalaryWorkflowRules(result?.data)
      setSavedPolicy(normalized)
      setDraftPolicy(normalized)
      setLoading(false)
      if (!result?.ok) {
        setError('Unable to load salary workflow rules from API; showing defaults.')
      }
    }

    hydrate()

    return () => {
      alive = false
    }
  }, [])

  const validateDraftPolicy = (policy) => {
    if (
      !policy?.fallback?.checkRole ||
      !policy?.fallback?.reviewRole ||
      !policy?.fallback?.approveRole
    ) {
      return 'Global workflow must define Check, Review, and Approve roles.'
    }

    for (let stageIndex = 0; stageIndex < STAGE_FIELDS.length; stageIndex += 1) {
      const stage = STAGE_FIELDS[stageIndex]
      const role = policy?.fallback?.[stage.key]
      if (!stageRoleOptions[stage.key]?.some((option) => option.value === role)) {
        return `${stage.label} role is invalid.`
      }
    }

    return null
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

  const handleSave = async () => {
    const validationMessage = validateDraftPolicy(draftPolicy)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setLoading(true)
    setError(null)
    const result = await saveSalaryWorkflowRules(draftPolicy)
    const normalized = normalizeSalaryWorkflowRules(result?.data)
    setLoading(false)

    if (!result?.ok) {
      setError('Unable to save salary workflow rules.')
      return
    }

    setSavedPolicy(normalized)
    setDraftPolicy(normalized)
    setEditMode(false)
    setStatusMessage('Salary workflow rules saved.')
    setTimeout(() => setStatusMessage(null), 2500)
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
        <span>Salary Workflow Rules</span>
        <EditControls
          editMode={editMode}
          loading={loading}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <ApprovalRulesEditor
          title="Global Workflow Rule"
          description="Configure a single Check, Review, and Approve setup applied to all salary applications."
          editMode={editMode}
          error={error}
          loading={loading}
          policy={draftPolicy}
          setPolicy={setDraftPolicy}
          setFallbackField={setFallbackField}
          sortedRoles={sortedRoles}
          stageFields={STAGE_FIELDS}
          stageRoleOptions={stageRoleOptions}
          statusMessage={statusMessage}
        />
      </CCardBody>
    </CCard>
  )
}

export default SalaryWorkflowRules
