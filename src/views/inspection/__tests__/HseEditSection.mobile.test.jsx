// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HseEditSection } from '../types/hse/section'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const HseEditHarness = ({ onSaveHseObservationDraft } = {}) => {
  const [form, setForm] = useState({
    hseSelections: [],
    hseAreaConditionRemarks: '',
    hseUnsafeActDetails: '',
    hseUnsafeConditionDetails: '',
    hseEnvironmentalDetails: '',
    hseSeverity: '',
    hseImmediateAction: '',
    hseCorrectiveAction: '',
    hseResponsiblePerson: '',
    hseTargetDate: '',
    hseRemarks: '',
  })

  const handlers = {
    onToggleHseSelection: (value) =>
      setForm((current) => ({
        ...current,
        hseSelections: current.hseSelections.includes(value) ? [] : [value],
      })),
    onUpdateHseField: (key, value) =>
      setForm((current) => ({
        ...current,
        [key]: value,
      })),
    onSaveHseObservationDraft,
  }

  return <HseEditSection form={form} handlers={handlers} />
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('HseEditSection mobile drawer', () => {
  it('collapses selected HSE observation and edits it in a mobile drawer', () => {
    setMobileViewport()

    render(<HseEditHarness />)

    expect(screen.getByText('Outcome')).toBeTruthy()

    fireEvent.click(screen.getByText('Area Satisfactory'))

    expect(screen.getByText('Observation')).toBeTruthy()
    expect(screen.getByText('Area Satisfactory')).toBeTruthy()
    expect(screen.queryByText('Outcome')).toBeNull()
    expect(screen.queryByText('Area Condition Remarks')).toBeNull()

    fireEvent.click(screen.getByLabelText('Edit HSE observation'))

    expect(screen.getByText('Outcome')).toBeTruthy()
    expect(screen.getByText('Area Condition Remarks')).toBeTruthy()
  })

  it('preserves trailing spaces in HSE remarks while typing', () => {
    setMobileViewport()

    render(<HseEditHarness />)

    fireEvent.click(screen.getByText('Area Satisfactory'))
    fireEvent.click(screen.getByLabelText('Edit HSE observation'))

    const remarks = screen.getByPlaceholderText(
      'Record the current safe/satisfactory condition of this area.',
    )
    fireEvent.change(remarks, { target: { value: 'area clean ' } })

    expect(
      screen.getByPlaceholderText('Record the current safe/satisfactory condition of this area.')
        .value,
    ).toBe('area clean ')
  })

  it('keeps HSE mobile edits local until Save', () => {
    setMobileViewport()
    const onSaveHseObservationDraft = vi.fn(() => ({ saved: true, local: true, pending: true }))

    render(<HseEditHarness onSaveHseObservationDraft={onSaveHseObservationDraft} />)

    fireEvent.click(screen.getByText('Area Satisfactory'))
    fireEvent.click(screen.getByLabelText('Edit HSE observation'))

    const remarks = screen.getByPlaceholderText(
      'Record the current safe/satisfactory condition of this area.',
    )
    fireEvent.change(remarks, { target: { value: 'area clean ' } })

    expect(onSaveHseObservationDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByLabelText('Edit HSE observation'))

    expect(
      screen.getByPlaceholderText('Record the current safe/satisfactory condition of this area.')
        .value,
    ).toBe('')

    fireEvent.change(
      screen.getByPlaceholderText('Record the current safe/satisfactory condition of this area.'),
      { target: { value: 'area clean ' } },
    )
    fireEvent.click(screen.getByText('Save'))

    expect(onSaveHseObservationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        hseAreaConditionRemarks: 'area clean ',
        hseSelections: ['areaSatisfactory'],
      }),
    )
    expect(screen.queryByText('Area Condition Remarks')).toBeNull()
  })
})
