// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ApprovalRulesEditor from '../ApprovalRulesEditor'

afterEach(() => {
  cleanup()
})

const stageFields = [
  { key: 'reviewRole', label: 'Review' },
  { key: 'recommendRole', label: 'Recommend' },
  { key: 'approveRole', label: 'Approve' },
]

const sortedRoles = [
  { value: 'Manager', label: 'Manager' },
  { value: 'HR Manager', label: 'HR Manager' },
  { value: 'System Administrator', label: 'System Administrator' },
]

const EditorHarness = ({ onPolicyChange = vi.fn() }) => {
  const [policy, setPolicy] = useState({
    fallback: {
      reviewRole: 'Manager',
      recommendRole: 'HR Manager',
      approveRole: 'System Administrator',
    },
    options: {
      requireRecommendation: false,
      enforceDistinctApprovers: false,
    },
    rules: [
      {
        id: 'rule-1',
        applicantRole: 'Manager',
        reviewRole: 'Manager',
        recommendRole: 'HR Manager',
        approveRole: 'System Administrator',
        active: true,
      },
    ],
  })

  const updatePolicy = (next) => {
    setPolicy(next)
    onPolicyChange(next)
  }

  return (
    <ApprovalRulesEditor
      title="Approval Flow"
      editMode
      policy={policy}
      setPolicy={updatePolicy}
      setFallbackField={(field, value) =>
        updatePolicy({ ...policy, fallback: { ...policy.fallback, [field]: value } })
      }
      setOptionField={(field, value) =>
        updatePolicy({ ...policy, options: { ...policy.options, [field]: value } })
      }
      setRuleField={vi.fn()}
      addRule={vi.fn()}
      removeRule={vi.fn()}
      sortedRoles={sortedRoles}
      stageFields={stageFields}
    />
  )
}

describe('ApprovalRulesEditor', () => {
  it('renders plain-language preview and applies three-stage preset to existing policy shape', () => {
    const onPolicyChange = vi.fn()
    render(<EditorHarness onPolicyChange={onPolicyChange} />)

    expect(screen.getByText(/Preview: Review: Manager/)).toBeTruthy()
    fireEvent.click(screen.getByText('Three-stage approval'))

    expect(onPolicyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fallback: expect.objectContaining({
          reviewRole: 'Manager',
          recommendRole: 'HR Manager',
          approveRole: 'System Administrator',
        }),
        options: expect.objectContaining({ requireRecommendation: true }),
        rules: expect.any(Array),
      }),
    )
  })

  it('applies single-approver preset without changing the saved object shape', () => {
    const onPolicyChange = vi.fn()
    render(<EditorHarness onPolicyChange={onPolicyChange} />)

    fireEvent.click(screen.getByText('Single approver'))

    expect(onPolicyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fallback: {
          reviewRole: 'System Administrator',
          recommendRole: 'System Administrator',
          approveRole: 'System Administrator',
        },
        options: expect.objectContaining({ requireRecommendation: false }),
        rules: expect.any(Array),
      }),
    )
  })
})
