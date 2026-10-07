// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ApprovalGates from '../ApprovalGates'

afterEach(() => cleanup())

const gates = [
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Recommended', label: 'Recommended' },
  { action: 'Approved', label: 'Approved' },
]

describe('ApprovalGates', () => {
  it('distinguishes completed stages from pending stages visually and accessibly', () => {
    render(
      <ApprovalGates
        gates={gates}
        approvalHistory={[{ action: 'Reviewed' }]}
        direction="horizontal"
      />,
    )

    expect(screen.getByRole('list', { name: 'Approval progress' })).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Reviewed: complete' })).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Recommended: pending' })).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Approved: pending' })).toBeTruthy()

    expect(document.querySelectorAll('.lucide-check')).toHaveLength(1)
    expect(document.querySelectorAll('.lucide-circle')).toHaveLength(2)
  })
})
