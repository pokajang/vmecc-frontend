// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REPORT_MOBILE_QUERY } from '../../hooks/useReportIsMobile'
import { ReportChronologySection } from '../ReportWorkflowUi'

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

const baseProps = {
  title: 'Chronology of Drill Events',
  actionLabel: 'Event / Action',
  rows: [{ id: 'row-1', time: '09:00', action: 'Exercise started' }],
  onAddRow: vi.fn(),
  onUpdateRow: vi.fn(),
  onRemoveRow: vi.fn(),
  onMoveRow: vi.fn(),
  maxRows: 8,
  actionMaxLength: 120,
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
  vi.clearAllMocks()
})

describe('ReportChronologySection responsive editor', () => {
  it('uses a mobile drawer and preserves add-row inputs and actions below 768px', () => {
    setViewport(700)
    const onAddRow = vi.fn()
    render(<ReportChronologySection {...baseProps} onAddRow={onAddRow} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    const drawer = document.querySelector('.mobile-bottom-drawer')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()

    fireEvent.change(within(drawer).getByLabelText('Time'), { target: { value: '09:15' } })
    const actionInput = within(drawer).getByLabelText('Event / Action')
    fireEvent.change(actionInput, { target: { value: 'Exercise response confirmed' } })
    expect(actionInput.getAttribute('maxlength')).toBe('120')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))

    expect(onAddRow).toHaveBeenCalledWith({
      time: '09:15',
      action: 'Exercise response confirmed',
    })
  })

  it('uses the same drawer and update callback when editing an existing row', () => {
    setViewport(375)
    const onUpdateRow = vi.fn()
    render(<ReportChronologySection {...baseProps} onUpdateRow={onUpdateRow} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit chronology row 1' }))

    const drawer = document.querySelector('.mobile-bottom-drawer')
    expect(within(drawer).getByText('Edit chronology row')).toBeTruthy()
    fireEvent.change(within(drawer).getByLabelText('Event / Action'), {
      target: { value: 'Updated exercise event' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))

    expect(onUpdateRow).toHaveBeenCalledWith('row-1', {
      time: '09:00',
      action: 'Updated exercise event',
    })
  })

  it('retains the inline chronology editor on desktop', () => {
    setViewport(1024)
    render(<ReportChronologySection {...baseProps} />)

    expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
    expect(screen.getByLabelText('Time').value).toBe('09:00')
    expect(screen.getByLabelText('Event / Action').value).toBe('Exercise started')
    expect(screen.getByRole('button', { name: 'Add Row' })).toBeTruthy()
  })
})
