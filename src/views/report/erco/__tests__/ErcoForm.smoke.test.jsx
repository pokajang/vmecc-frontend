// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErcoSetupStep from '../ErcoSetupStep'
import ErcoRespondingTeamStep from '../ErcoRespondingTeamStep'
import ErcoDetailsStep from '../ErcoDetailsStep'
import { defaultErcoForm } from '../utils'
import { PostIncidentAnalysisSection } from '../erco-form-components'

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

afterEach(() => {
  cleanup()
})

const setMobileViewport = (matches) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

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
  setMobileViewport(false)
  render(<ErcoStepHarness />)
  fireEvent.click(screen.getByText('Continue'))
  await waitFor(() => expect(screen.getByText('On-Scene Responders')).toBeTruthy())
  fireEvent.click(screen.getByText('Continue'))
  await waitFor(() =>
    expect(screen.getByLabelText('Event / Action for chronology row 1')).toBeTruthy(),
  )
}

const renderSetupStep = ({ mobile = false, seed = {} } = {}) => {
  setMobileViewport(mobile)

  const Harness = () => {
    const [form, setForm] = useState(() => ({
      ...defaultErcoForm(),
      incidentType: 'Fire',
      weather: 'Clear',
      location: ['Zone 1'],
      incidentDate: '2026-04-25',
      incidentTime: '09:30',
      ...seed,
    }))
    const [setupFieldErrors, setSetupFieldErrors] = useState({})

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
        onContinue={vi.fn()}
      />
    )
  }

  return render(<Harness />)
}

const renderPostAnalysis = ({ mobile = false, seed = {} } = {}) => {
  setMobileViewport(mobile)

  const Harness = () => {
    const [value, setValue] = useState({
      strengths: [],
      resourcesMobilised: [],
      improvementOpportunities: [],
      photos: [],
      ...seed,
    })

    return <PostIncidentAnalysisSection value={value} onChange={setValue} pushToast={vi.fn()} />
  }

  return render(<Harness />)
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

describe('ERCO mobile setup polish', () => {
  it('renders completed mobile setup groups as summaries and reopens one for editing', async () => {
    renderSetupStep({ mobile: true })

    expect(screen.getByText('Incident Type')).toBeTruthy()
    expect(screen.getByText('Weather')).toBeTruthy()
    expect(screen.getByText('Area')).toBeTruthy()
    expect(screen.getByText('Date & Time')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Incident Type' }))
    expect(screen.getByText('Choose Incident Type')).toBeTruthy()
  })

  it('keeps area open for multi-select on mobile until Done is tapped', async () => {
    const scrollSpy = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollSpy

    renderSetupStep({ mobile: true, seed: { location: [] } })

    fireEvent.click(screen.getByText('Zone 1'))
    fireEvent.click(screen.getByText('Zone 2'))
    expect(scrollSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.getByText('2 areas selected')).toBeTruthy())
  })

  it('auto-advances empty mobile setup groups one at a time', async () => {
    renderSetupStep({
      mobile: true,
      seed: {
        incidentType: '',
        weather: '',
        location: [],
        incidentDate: '',
        incidentTime: '',
      },
    })

    expect(screen.getByText('Choose Incident Type')).toBeTruthy()
    expect(screen.queryByText('Choose Area')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /Fire/i }))
    await waitFor(() => expect(screen.getByText('Weather')).toBeTruthy())
    expect(screen.queryByText('Choose Area')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /Clear/i }))
    await waitFor(() => expect(screen.getByText('Choose Area')).toBeTruthy())
  })

  it('keeps desktop setup expanded', () => {
    renderSetupStep({ mobile: false })

    expect(screen.getByText('Choose Emergency / Incident Type')).toBeTruthy()
    expect(screen.getByText('Choose Weather')).toBeTruthy()
    expect(screen.getByText('Choose Location / Area')).toBeTruthy()
    expect(screen.queryByText('Date & Time')).toBeNull()
  })
})

describe('ERCO post-analysis mobile polish', () => {
  it('opens the first incomplete mobile accordion group by default', async () => {
    renderPostAnalysis({
      mobile: true,
      seed: { strengths: ['Response time met KPI target'] },
    })

    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: /Resources\s*0 selected/i })
          .getAttribute('aria-expanded'),
      ).toBe('true'),
    )
    expect(
      screen.getByRole('button', { name: /Strengths\s*1 selected/i }).getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('switches mobile accordion groups without clearing selected values', async () => {
    renderPostAnalysis({
      mobile: true,
      seed: { strengths: ['Rapid command setup'] },
    })

    fireEvent.click(screen.getByRole('button', { name: /Photos\s*0 photos/i }))
    expect(screen.getByText('No photos yet. Upload photos to continue.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Strengths\s*1 selected/i }))
    expect(screen.getByText('KPI Response Time')).toBeTruthy()
  })

  it('keeps desktop analysis sections visible together', () => {
    renderPostAnalysis({ mobile: false })

    expect(screen.getByText('Resources, Equipment & Consumables Mobilised')).toBeTruthy()
    expect(screen.getByText('Strengths')).toBeTruthy()
    expect(screen.getByText('Improvement Opportunities')).toBeTruthy()
    expect(screen.getByText('Photographs')).toBeTruthy()
  })
})
