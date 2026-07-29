// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HseEditSection } from '../types/hse/v2Section'
import {
  buildHseDescription,
  getHseMissingFields,
  normalizeHseFormFields,
} from '../types/hse/helpers'

const baseForm = {
  hsePayloadVersion: 2,
  hseSelections: [],
  hseUnsafeActDetails: '',
  hseUnsafeConditionDetails: '',
  hseImmediateAction: '',
  photos: [],
}

const Harness = () => {
  const [form, setForm] = useState(baseForm)
  const handlers = {
    onToggleHseSelection: (selection) =>
      setForm((current) => ({
        ...current,
        hseSelections: current.hseSelections.includes(selection) ? [] : [selection],
        hseUnsafeActDetails: selection === 'unsafeAct' ? current.hseUnsafeActDetails : '',
        hseUnsafeConditionDetails:
          selection === 'unsafeCondition' ? current.hseUnsafeConditionDetails : '',
      })),
    onUpdateHseField: (field, value) => setForm((current) => ({ ...current, [field]: value })),
    onTakeGeneralPhoto: vi.fn(),
    onUploadGeneralPhoto: vi.fn(),
  }
  return <HseEditSection form={form} handlers={handlers} />
}

afterEach(cleanup)

describe('HSE v2 observation flow', () => {
  it('shows only the lean field workflow and switches the owned description field', () => {
    render(<Harness />)

    const choices = screen.getAllByRole('radio')
    expect(choices).toHaveLength(2)
    expect(choices[0].classList.contains('vmecc-choice-button')).toBe(true)
    expect(choices[0].getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('Unsafe Act')).toBeTruthy()
    expect(screen.getByText('Unsafe Condition')).toBeTruthy()
    expect(screen.queryByText('Severity')).toBeNull()
    expect(screen.queryByText('Environmental')).toBeNull()
    expect(screen.getByText('Immediate corrective action (optional)')).toBeTruthy()

    fireEvent.click(screen.getByText('Unsafe Act'))
    expect(choices[0].getAttribute('aria-checked')).toBe('true')
    fireEvent.change(screen.getByLabelText('Observation description'), {
      target: { value: 'Worker entered a barricaded area.' },
    })
    expect(screen.getByLabelText('Observation description').value).toBe(
      'Worker entered a barricaded area.',
    )

    fireEvent.click(screen.getByText('Unsafe Condition'))
    expect(screen.getByLabelText('Observation description').value).toBe('')
  })

  it('requires one type, its description, and a root photo', () => {
    expect(getHseMissingFields(baseForm)).toEqual(
      expect.objectContaining({ hseSelection: true, hseDetails: true }),
    )
    const complete = {
      ...baseForm,
      hseSelections: ['unsafeCondition'],
      hseUnsafeConditionDetails: 'Guard rail is missing.',
      photos: [{ id: 'photo-1', url: 'managed://photo-1' }],
      selectedLocation: 'Zone A > Dock',
    }
    expect(getHseMissingFields(complete)).toEqual(
      expect.objectContaining({ hseSelection: false, hseDetails: false }),
    )
    expect(buildHseDescription(complete)).toContain('Unsafe Condition observed at Zone A > Dock.')
    expect(normalizeHseFormFields(complete).hsePayloadVersion).toBe(2)
  })
})
