import React, { useEffect, useMemo, useState } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import EditControls from 'src/components/EditControls'
import { ROLE_OPTIONS } from 'src/constants/roles'
import ApprovalRulesEditor from './ApprovalRulesEditor'
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
    loadLeaveApprovalRules()
      .then((result) => {
        if (!mounted) return
        const policy = normalizeLeaveApprovalRules(result?.data)
        setSavedPolicy(policy)
        setDraftPolicy(policy)
        setLoading(false)
        if (!result?.ok) {
          setError('Unable to load leave approval rules.')
        }
      })
      .catch(() => {
        if (!mounted) return
        setLoading(false)
        setError('Unable to load leave approval rules.')
      })
    return () => {
      mounted = false
    }
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
      if (!result?.ok) {
        throw result?.error || new Error('Unable to save leave approval rules.')
      }
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
    <CCard className="mb-4" data-testid="leave-management-rules">
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
        <ApprovalRulesEditor
          title="Leave Approval Flow"
          description="Configure dynamic workflow routing by applicant role. These rules define who reviews, recommends, and provides final approval for leave submissions."
          editMode={editMode}
          error={error}
          loading={loading}
          policy={draftPolicy}
          setPolicy={setDraftPolicy}
          setFallbackField={setFallbackField}
          setOptionField={setOptionField}
          setRuleField={setRuleField}
          addRule={addRule}
          removeRule={removeRule}
          sortedRoles={sortedRoles}
          stageFields={STAGE_FIELDS}
          statusMessage={statusMessage}
        />
      </CCardBody>
    </CCard>
  )
}

export default LeaveApprovalRules
