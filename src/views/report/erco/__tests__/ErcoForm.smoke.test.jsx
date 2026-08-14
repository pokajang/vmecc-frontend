// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErcoSetupStep from '../ErcoSetupStep'
import ErcoRespondingTeamStep from '../ErcoRespondingTeamStep'
import ErcoDetailsStep from '../ErcoDetailsStep'
import { defaultErcoForm } from '../utils'
import { PostIncidentAnalysisSection } from '../erco-form-components'

const { streamAiHelperMessage } = vi.hoisted(() => ({
  streamAiHelperMessage: vi.fn(),
}))

vi.mock('src/services/api/aiHelperApi', () => ({
  streamAiHelperMessage,
}))

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

beforeEach(() => {
  streamAiHelperMessage.mockReset()
  streamAiHelperMessage.mockImplementation(async (payload, handlers) => {
    if (String(payload?.message || '').includes('Check this ERCO report')) {
      const reviewJson = JSON.stringify({
        items: [
          {
            status: 'needs_attention',
            message: 'Chronology has a gap that may need a short note if relevant.',
          },
        ],
      })
      handlers.onDelta?.({
        text: reviewJson,
      })
      handlers.onDone?.({
        embedded_result: JSON.parse(reviewJson),
        message: {
          content: reviewJson,
          embedded_result: JSON.parse(reviewJson),
        },
      })
      return
    }

    handlers.onDelta?.({
      text: 'Generated incident summary from AI.',
    })
    handlers.onDone?.({
      embedded_result: { summary: 'Generated incident summary from AI.' },
      message: {
        content: 'Generated incident summary from AI.',
        embedded_result: { summary: 'Generated incident summary from AI.' },
      },
    })
  })
})

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
  expect(
    screen
      .getByRole('region', { name: 'Incident Summary' })
      .querySelectorAll('.workflow-summary__item'),
  ).toHaveLength(6)
  fireEvent.click(screen.getByText('Continue'))
  await waitFor(() =>
    expect(screen.getByLabelText('Event / Action for chronology row 1')).toBeTruthy(),
  )
  expect(screen.getByRole('region', { name: 'Incident Summary' })).toBeTruthy()
}

const renderDetailsStep = ({ seed = {} } = {}) => {
  cleanup()
  setMobileViewport(false)

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

    return (
      <form>
        <ErcoDetailsStep
          userId="u-1"
          form={form}
          fieldErrors={{}}
          setForm={setForm}
          pushToast={vi.fn()}
          onBack={vi.fn()}
          onContinue={vi.fn()}
          onClear={vi.fn()}
        />
      </form>
    )
  }

  return render(<Harness />)
}

const renderSetupStep = ({ mobile = false, seed = {}, errors = {} } = {}) => {
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
    const [setupFieldErrors, setSetupFieldErrors] = useState(errors)

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
  it('moves event actions between fixed chronology times', async () => {
    await proceedToDetailsStep()

    const timeInputs = screen.getAllByLabelText(/Time for chronology row/i)
    const eventInputs = screen.getAllByLabelText(/Event \/ Action for chronology row/i)
    const originalTimes = timeInputs.map((input) => input.value)
    const firstAction = eventInputs[0].value
    const secondAction = eventInputs[1].value

    expect(screen.queryByLabelText(/Drag chronology row/i)).toBeNull()
    expect(screen.getAllByLabelText(/Drag event\/action for chronology row/i)).toHaveLength(
      eventInputs.length,
    )

    fireEvent.click(screen.getByLabelText('Move event/action for chronology row 1 down'))

    expect(timeInputs.map((input) => input.value)).toEqual(originalTimes)
    expect(eventInputs[0].value).toBe(secondAction)
    expect(eventInputs[1].value).toBe(firstAction)
  })

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

  it('generates an ERCO summary through Ask AI and applies the preview', async () => {
    await proceedToDetailsStep()

    fireEvent.click(screen.getByRole('button', { name: /Generate AI summary/i }))
    await waitFor(() => expect(screen.getByText('Generate Incident Summary')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Generate Summary' }))

    await waitFor(() => {
      expect(streamAiHelperMessage).toHaveBeenCalledTimes(1)
      expect(screen.getByDisplayValue('Generated incident summary from AI.')).toBeTruthy()
    })

    const [payload] = streamAiHelperMessage.mock.calls[0]
    expect(payload.response_language).toBe('en')
    expect(payload.embedded_task).toBe('erco_generate_summary')
    expect(payload.page_context).toEqual({
      path: expect.any(String),
      search: '',
      route_key: 'reports.erco.form',
      route_name: '',
      module_key: 'reports',
      title: 'ERCO Report Form',
      params: {
        report_type: 'erco',
      },
    })
    expect(payload.page_context).not.toHaveProperty('assistant_surface')
    expect(payload.page_context).not.toHaveProperty('conversation_purpose')
    expect(payload.page_context).not.toHaveProperty('form_snapshot')
    expect(payload.message).toContain('Generate an ERCO emergency response incident summary')
    expect(payload.message).toContain('Do not invent facts')
    expect(payload.message).toContain('Do not include unrelated HSE, inspection')

    fireEvent.click(screen.getByRole('button', { name: 'Use This Summary' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Generated incident summary from AI.')).toBeTruthy()
    })
  })

  it('improves an existing summary without changing the form until preview is accepted', async () => {
    await proceedToDetailsStep()

    const summaryInput = screen.getByLabelText('Summary of Emergency / Incident')
    fireEvent.change(summaryInput, {
      target: { value: 'Existing summary that needs clearer wording.' },
    })

    expect(screen.getByRole('button', { name: /Improve Summary with AI/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Improve Summary with AI/i }))
    await waitFor(() => expect(screen.getByText('Improve Incident Summary')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Improve Summary' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Generated incident summary from AI.')).toBeTruthy()
    })

    const [payload] = streamAiHelperMessage.mock.calls[0]
    expect(payload.embedded_task).toBe('erco_improve_summary')
    expect(payload.message).toContain(
      'Improve the existing ERCO emergency response incident summary',
    )
    expect(payload.message).toContain('Preserve the original meaning and facts')
    expect(payload.message).toContain('Existing summary that needs clearer wording.')
  })

  it('keeps an oversized ERCO report editable and does not send it to AI', async () => {
    renderDetailsStep({ seed: { summary: 'x'.repeat(12000) } })

    fireEvent.click(screen.getByRole('button', { name: /Improve Summary with AI/i }))
    await waitFor(() => expect(screen.getByText('Improve Incident Summary')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Improve Summary' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'This report is too long for AI assistance. Shorten the summary or continue editing manually.',
        ),
      ).toBeTruthy()
    })

    expect(streamAiHelperMessage).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Summary of Emergency / Incident').value).toHaveLength(12000)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })
})

describe('ERCO mobile setup polish', () => {
  it('renders completed mobile setup groups as summaries and reopens one for editing', async () => {
    renderSetupStep({ mobile: true })

    const summary = screen.getByLabelText('ERCO setup summary')
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(4)
    expect(screen.getByText('Incident Type')).toBeTruthy()
    expect(screen.getByText('Weather')).toBeTruthy()
    expect(screen.getByText('Area')).toBeTruthy()
    expect(screen.getByText('Date & Time')).toBeTruthy()
    expect(document.querySelector('.mobile-setup-summary')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Incident Type' }))
    expect(screen.getByText('Choose Incident Type')).toBeTruthy()
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(3)
  })

  it('keeps area open for multi-select on mobile until Confirm Areas is tapped', async () => {
    const scrollSpy = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollSpy

    renderSetupStep({ mobile: true, seed: { location: [] } })

    fireEvent.click(screen.getByText('Zone 1'))
    fireEvent.click(screen.getByText('Zone 2'))
    expect(scrollSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Areas' }))

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

  it('collapses completed desktop setup groups into summaries', () => {
    renderSetupStep({ mobile: false })

    expect(screen.getByRole('group', { name: 'Incident Type' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Weather' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Area' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Date & Time' })).toBeTruthy()
    expect(screen.queryByText('Choose Emergency / Incident Type')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Incident Type' }))
    expect(screen.getByText('Choose Emergency / Incident Type')).toBeTruthy()
  })

  it('reopens a completed desktop group when validation finds an invalid value', () => {
    renderSetupStep({
      mobile: false,
      errors: { incidentDate: 'Incident date cannot be in the future.' },
    })

    expect(screen.getByText('Choose Incident Date')).toBeTruthy()
    expect(screen.getByText('Incident date cannot be in the future.')).toBeTruthy()
    expect(screen.queryByLabelText('Edit Date & Time')).toBeNull()
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
    expect(document.querySelector('[data-erco-field="postIncidentPhotos"]')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Strengths\s*1 selected/i }))
    expect(screen.getByText('KPI Response Time')).toBeTruthy()
  })

  it('keeps desktop analysis sections visible together', () => {
    renderPostAnalysis({ mobile: false })

    expect(screen.getByText('Resources, Equipment & Consumables Mobilised')).toBeTruthy()
    expect(screen.getByText('Strengths')).toBeTruthy()
    expect(screen.getByText('Improvement Opportunities')).toBeTruthy()
    expect(screen.getByText('Incident photographs')).toBeTruthy()
  })
})
