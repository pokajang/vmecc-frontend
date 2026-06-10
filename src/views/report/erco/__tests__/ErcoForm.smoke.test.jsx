// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ErcoSetupStep from '../ErcoSetupStep'
import ErcoRespondingTeamStep from '../ErcoRespondingTeamStep'
import ErcoDetailsStep from '../ErcoDetailsStep'
import { defaultErcoForm } from '../utils'

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

vi.stubGlobal('localStorage', createStorageMock())

vi.mock('src/services/apiClient', async () => {
  const actual = await vi.importActual('src/services/apiClient')
  return {
    ...actual,
    fetchRosters: vi.fn(async () => ({
      data: [
        {
          shifts: {
            day: { team: 'Alpha' },
            night: { team: 'Bravo' },
          },
        },
      ],
    })),
    fetchShiftWindows: vi.fn(async () => ({
      data: {
        day_start: '07:00',
        day_end: '19:00',
        night_start: '19:00',
        night_end: '07:00',
      },
    })),
    fetchTeams: vi.fn(async () => ({
      data: [
        {
          name: 'Alpha',
          members: [
            { id: 'u-1', name: 'Azam Bin Husain', role: 'AIC' },
            { id: 'u-2', name: 'Alpha TRT 1', role: 'TRT' },
          ],
        },
      ],
    })),
  }
})

const ErcoStepHarness = () => {
  const [step, setStep] = useState('setup')
  const [form, setForm] = useState(() => ({
    ...defaultErcoForm(),
    incidentType: 'Fire',
    weather: 'Clear',
    location: ['Zone 1'],
    incidentDate: '2026-04-25',
    incidentTime: '09:30',
  }))
  const [setupFieldErrors, setSetupFieldErrors] = useState({})
  const [fieldErrors] = useState({})

  if (step === 'setup') {
    return (
      <ErcoSetupStep
        userId="u-1"
        form={form}
        setForm={setForm}
        setupFieldErrors={setupFieldErrors}
        setSetupFieldErrors={setSetupFieldErrors}
        datePresetOptions={[
          { title: 'Today', description: 'Current date', value: '2026-04-25' },
          { title: 'Yesterday', description: 'Previous date', value: '2026-04-24' },
          { title: '2 days ago', description: 'Earlier date', value: '2026-04-23' },
        ]}
        pushToast={vi.fn()}
        onContinue={() => setStep('team')}
      />
    )
  }

  if (step === 'team') {
    return (
      <ErcoRespondingTeamStep
        user={{ id: 'u-1', name: 'Tester', email: 'tester@example.com' }}
        form={form}
        setForm={setForm}
        errorMessage=""
        clearError={vi.fn()}
        pushToast={vi.fn()}
        onBack={() => setStep('setup')}
        onContinue={() => setStep('details')}
      />
    )
  }

  return (
    <form>
      <ErcoDetailsStep
        userId="u-1"
        form={form}
        fieldErrors={fieldErrors}
        setForm={setForm}
        pushToast={vi.fn()}
        onBack={() => setStep('team')}
        onContinue={vi.fn()}
        onClear={vi.fn()}
        onSaveDraft={vi.fn()}
      />
    </form>
  )
}

const proceedToDetailsStep = async () => {
  cleanup()
  render(<ErcoStepHarness />)
  fireEvent.click(screen.getByText('Continue'))
  await waitFor(() => expect(screen.getByText('On-Scene Responders')).toBeTruthy())
  fireEvent.click(screen.getByText('Continue'))
  await waitFor(() =>
    expect(screen.getByLabelText('Event / Action for chronology row 1')).toBeTruthy(),
  )
}

describe('ERCO step smoke flow', () => {
  it('progresses setup -> team -> details and supports title + chronology interactions', async () => {
    await proceedToDetailsStep()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Worker collapse reported' },
    })

    const beforeRows = screen.getAllByLabelText(/Event \/ Action for chronology row/i).length
    fireEvent.click(screen.getByText('Add Row'))
    const afterRows = screen.getAllByLabelText(/Event \/ Action for chronology row/i).length
    expect(afterRows).toBeGreaterThan(beforeRows)

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton.hasAttribute('disabled')).toBe(false)
  })

  it('adds a row with Enter only when editing an Event / Action input', async () => {
    await proceedToDetailsStep()

    const beforeRows = screen.getAllByLabelText(/Event \/ Action for chronology row/i).length
    const firstEventInput = screen.getByLabelText('Event / Action for chronology row 1')
    fireEvent.keyDown(firstEventInput, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      const afterRows = screen.getAllByLabelText(/Event \/ Action for chronology row/i).length
      expect(afterRows).toBe(beforeRows + 1)
    })

    const timeInputs = screen.getAllByLabelText(/Time for chronology row/i)
    expect(timeInputs[1].value).toBe('09:35')
  })

  it('sorts chronology when times are out of order', async () => {
    await proceedToDetailsStep()

    fireEvent.change(screen.getByLabelText('Time for chronology row 1'), {
      target: { value: '10:00' },
    })
    fireEvent.change(screen.getByLabelText('Time for chronology row 2'), {
      target: { value: '09:00' },
    })

    expect(screen.getByText('Some times are out of order.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sort by time' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Time for chronology row 1').value).toBe('09:00')
      expect(screen.getByLabelText('Time for chronology row 3').value).toBe('10:00')
      expect(screen.queryByText('Some times are out of order.')).toBeNull()
    })
  })

  it('supports undo after adding a chronology row', async () => {
    await proceedToDetailsStep()

    const beforeRows = screen.getAllByLabelText(/Event \/ Action for chronology row/i).length
    fireEvent.click(screen.getByText('Add Row'))
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Event \/ Action for chronology row/i).length).toBe(
        beforeRows + 1,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Event \/ Action for chronology row/i).length).toBe(
        beforeRows,
      )
    })
  })
})
