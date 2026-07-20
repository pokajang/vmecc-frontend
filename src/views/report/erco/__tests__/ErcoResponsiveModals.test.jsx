// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  ChronologyRowModal,
  ChronologyStartModeModal,
  ErcoAiReviewModal,
  PreMobModeModal,
  SummaryGenerationModal,
} from '../erco-form-components'
import { ERCO_MOBILE_QUERY } from '../erco-form-components/useIsMobile'

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
      matches: query === ERCO_MOBILE_QUERY && width <= 767.98,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const modalCases = [
  {
    name: 'chronology row',
    renderModal: () => (
      <ChronologyRowModal
        visible
        draft={{ editId: null, time: '17:51', action: '' }}
        onClose={vi.fn()}
        onChangeDraft={vi.fn()}
        onSave={vi.fn()}
        onSaveAndNext={vi.fn()}
      />
    ),
  },
  {
    name: 'chronology initialization',
    renderModal: () => (
      <ChronologyStartModeModal
        visible
        responseStartTime="17:51"
        onClose={vi.fn()}
        onManual={vi.fn()}
        onPremob={vi.fn()}
      />
    ),
  },
  {
    name: 'PreMob mode',
    renderModal: () => (
      <PreMobModeModal visible onClose={vi.fn()} onAppend={vi.fn()} onReplace={vi.fn()} />
    ),
  },
  {
    name: 'summary generation',
    renderModal: () => (
      <SummaryGenerationModal
        visible
        stage="confirm"
        currentSummary="Current summary"
        generatedSummary=""
        errorMessage=""
        onClose={vi.fn()}
        onGenerate={vi.fn()}
        onRetry={vi.fn()}
        onUseGenerated={vi.fn()}
      />
    ),
  },
  {
    name: 'AI review',
    renderModal: () => (
      <ErcoAiReviewModal
        visible
        stage="confirm"
        items={[]}
        errorMessage=""
        onClose={vi.fn()}
        onRun={vi.fn()}
        onRetry={vi.fn()}
      />
    ),
  },
]

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

describe('ERCO responsive modals', () => {
  it.each(modalCases)(
    'renders the $name in a drawer throughout the mobile layout',
    ({ renderModal }) => {
      setViewport(700)

      render(renderModal())

      expect(document.querySelector('.mobile-bottom-drawer')).toBeTruthy()
      expect(document.querySelector('.modal.show')).toBeNull()
    },
  )

  it('keeps the chronology row editor as a modal on desktop', () => {
    setViewport(1024)

    render(modalCases[0].renderModal())

    expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
    expect(document.querySelector('.modal.show')).toBeTruthy()
  })

  it('preserves chronology row actions inside the mobile drawer', () => {
    setViewport(375)
    const onSave = vi.fn()
    const onSaveAndNext = vi.fn()

    render(
      <ChronologyRowModal
        visible
        draft={{ editId: null, time: '17:51', action: '' }}
        onClose={vi.fn()}
        onChangeDraft={vi.fn()}
        onSave={onSave}
        onSaveAndNext={onSaveAndNext}
      />,
    )

    const drawer = document.querySelector('.mobile-bottom-drawer')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save & add next' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))

    expect(onSaveAndNext).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Time').value).toBe('17:51')
  })

  it('prevents closing the AI summary drawer while generation is loading', () => {
    setViewport(375)
    const onClose = vi.fn()

    render(
      <SummaryGenerationModal
        visible
        stage="loading"
        currentSummary=""
        generatedSummary=""
        errorMessage=""
        onClose={onClose}
        onGenerate={vi.fn()}
        onRetry={vi.fn()}
        onUseGenerated={vi.fn()}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Close Generate Incident Summary' })
    expect(closeButton.disabled).toBe(true)
    fireEvent.click(closeButton)
    expect(onClose).not.toHaveBeenCalled()
  })
})
