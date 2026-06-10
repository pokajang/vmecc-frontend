// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportWorkflowActionModal from '../ReportWorkflowActionModal'

const baseRecord = {
  id: 'report-erco-1',
  displayId: 'ERCO-01-01012026',
  incidentType: 'Fire',
  location: 'Zone A',
  incidentDate: '2026-04-28',
  incidentTime: '14:00',
  status: 'Submitted',
}

const Harness = ({
  actionType = 'review',
  defaultDeclarationChecked = false,
  onSubmit = vi.fn(),
}) => {
  const [remarks, setRemarks] = useState('')
  const [declarationChecked, setDeclarationChecked] = useState(defaultDeclarationChecked)

  return (
    <ReportWorkflowActionModal
      visible
      actionType={actionType}
      record={baseRecord}
      remarks={remarks}
      onRemarksChange={setRemarks}
      declarationChecked={declarationChecked}
      onDeclarationChange={setDeclarationChecked}
      declarationLabel="I confirm this report workflow action is accurate."
      declarationError=""
      rejectError=""
      actionDisabled={false}
      renderStatusBadge={(status) => <span>{status}</span>}
      formatDateTime={(date, time) => `${date} ${time}`}
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe('ReportWorkflowActionModal', () => {
  it('blocks reject submit until remarks are provided', () => {
    const onSubmit = vi.fn()
    render(<Harness actionType="reject" defaultDeclarationChecked onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'Reject' })
    expect(submitButton.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('Add your remarks'), {
      target: { value: 'Insufficient evidence provided.' },
    })

    expect(submitButton.hasAttribute('disabled')).toBe(false)
    fireEvent.click(submitButton)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('blocks submit until declaration is checked', () => {
    const onSubmit = vi.fn()
    render(<Harness actionType="review" defaultDeclarationChecked={false} onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'Review' })
    expect(submitButton.hasAttribute('disabled')).toBe(true)

    fireEvent.click(screen.getByRole('checkbox'))
    expect(submitButton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(submitButton)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('allows approve submit with empty remarks when declaration is checked', () => {
    const onSubmit = vi.fn()
    render(<Harness actionType="approve" defaultDeclarationChecked onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'Approve' })
    expect(submitButton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(submitButton)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
