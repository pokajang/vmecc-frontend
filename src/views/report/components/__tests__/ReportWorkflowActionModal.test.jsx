// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportWorkflowActionModal from '../ReportWorkflowActionModal'
import { REPORT_MOBILE_QUERY } from '../../hooks/useReportIsMobile'

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

const setViewport = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === REPORT_MOBILE_QUERY && width <= 767.98,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
})

describe('ReportWorkflowActionModal', () => {
  it('uses the mobile drawer throughout the reporting mobile breakpoint', () => {
    setViewport(700)
    render(<Harness actionType="review" />)

    const drawer = document.querySelector('.mobile-bottom-drawer')
    expect(drawer).toBeTruthy()
    expect(drawer.classList.contains('mobile-bottom-drawer--confirm')).toBe(true)
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(screen.getByPlaceholderText('Add your remarks')).toBeTruthy()
    expect(screen.getByRole('checkbox')).toBeTruthy()
  })

  it('retains the modal presentation on desktop', () => {
    setViewport(1024)
    render(<Harness actionType="approve" defaultDeclarationChecked />)

    expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
    expect(document.querySelector('.modal.show')).toBeTruthy()
  })

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
