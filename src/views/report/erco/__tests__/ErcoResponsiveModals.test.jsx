// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

const choiceModalCases = [
  {
    name: 'chronology initialization',
    title: 'Initialize Chronology',
    body: 'Response start time is set to 17:51. Choose how to begin chronology.',
    actions: [
      { label: 'Cancel', colorClass: 'btn-light', callback: 'onClose' },
      { label: 'Start with Manual Row', colorClass: 'btn-secondary', callback: 'onSecondary' },
      { label: 'Add PreMob Template', colorClass: 'btn-primary', callback: 'onTerminal' },
    ],
    renderModal: ({ onClose, onSecondary, onTerminal }) => (
      <ChronologyStartModeModal
        visible
        responseStartTime="17:51"
        onClose={onClose}
        onManual={onSecondary}
        onPremob={onTerminal}
      />
    ),
  },
  {
    name: 'PreMob mode',
    title: 'Add PreMob Events',
    body: 'Current chronology already has events. Choose how to apply PreMob rows.',
    actions: [
      { label: 'Cancel', colorClass: 'btn-light', callback: 'onClose' },
      { label: 'Append to Current', colorClass: 'btn-secondary', callback: 'onSecondary' },
      { label: 'Start New (Replace)', colorClass: 'btn-warning', callback: 'onTerminal' },
    ],
    renderModal: ({ onClose, onSecondary, onTerminal }) => (
      <PreMobModeModal visible onClose={onClose} onAppend={onSecondary} onReplace={onTerminal} />
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

  it.each(choiceModalCases)(
    'preserves the $name desktop shell, content, action contract, and form safety',
    ({ title, body, actions, renderModal }) => {
      setViewport(1024)
      const callbacks = {
        onClose: vi.fn(),
        onSecondary: vi.fn(),
        onTerminal: vi.fn(),
      }
      const onSubmit = vi.fn((event) => event.preventDefault())

      render(<form onSubmit={onSubmit}>{renderModal(callbacks)}</form>)

      const dialog = screen.getByRole('dialog')
      const modalDialog = dialog.querySelector('.modal-dialog')
      const modalBody = dialog.querySelector('.modal-body')
      const modalFooter = dialog.querySelector('.modal-footer')

      expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
      expect(modalDialog?.classList.contains('modal-dialog-centered')).toBe(true)
      expect(modalDialog?.classList.contains('modal-dialog-scrollable')).toBe(true)
      expect(modalDialog?.classList.contains('modal-fullscreen-sm-down')).toBe(true)
      expect(dialog.textContent).toContain(title)
      expect(modalBody?.textContent.replace(/\s+/g, ' ').trim()).toBe(body)

      const actionButtons = within(modalFooter).getAllByRole('button')
      expect(actionButtons.map((button) => button.textContent.trim())).toEqual(
        actions.map(({ label }) => label),
      )

      actions.forEach(({ label, colorClass, callback }) => {
        const button = within(modalFooter).getByRole('button', { name: label })
        expect(button.type).toBe('button')
        expect(button.classList.contains(colorClass)).toBe(true)
        fireEvent.click(button)
        expect(callbacks[callback]).toHaveBeenCalledTimes(1)
        expect(callbacks[callback].mock.calls[0][0]?.type).toBe('click')
      })
      expect(onSubmit).not.toHaveBeenCalled()
    },
  )

  it.each(choiceModalCases)(
    'preserves the $name mobile shell, content, close name, and action order',
    ({ title, body, actions, renderModal }) => {
      setViewport(767)
      const callbacks = {
        onClose: vi.fn(),
        onSecondary: vi.fn(),
        onTerminal: vi.fn(),
      }

      render(renderModal(callbacks))

      const dialog = screen.getByRole('dialog', { name: title })
      const drawerBody = dialog.querySelector('.inspection-mobile-detail-drawer-body')
      const drawerFooter = dialog.querySelector('.mobile-bottom-drawer__footer')

      expect(document.querySelector('.modal.show')).toBeNull()
      expect(drawerBody?.classList.contains('inspection-equipment-detail-drawer-body')).toBe(true)
      expect(drawerBody?.textContent.replace(/\s+/g, ' ').trim()).toBe(body)
      expect(drawerFooter?.className).toContain(
        'd-flex flex-wrap align-items-center justify-content-end gap-2',
      )
      expect(screen.getByRole('button', { name: `Close ${title}` })).toBeTruthy()
      expect(
        within(drawerFooter)
          .getAllByRole('button')
          .map((button) => button.textContent.trim()),
      ).toEqual(actions.map(({ label }) => label))
    },
  )

  it('switches the ERCO choice shell immediately above the mobile breakpoint', () => {
    const renderChoice = () =>
      choiceModalCases[0].renderModal({
        onClose: vi.fn(),
        onSecondary: vi.fn(),
        onTerminal: vi.fn(),
      })

    setViewport(767)
    const mobileRender = render(renderChoice())
    expect(document.querySelector('.mobile-bottom-drawer')).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()

    mobileRender.unmount()
    setViewport(768)
    render(renderChoice())
    expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
    expect(document.querySelector('.modal.show')).toBeTruthy()
  })

  it('preserves ERCO mobile Escape dismissal and focus restoration', async () => {
    setViewport(375)
    const trigger = document.createElement('button')
    trigger.textContent = 'Open chronology choices'
    document.body.appendChild(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const renderChoice = (visible) => (
      <ChronologyStartModeModal
        visible={visible}
        responseStartTime="17:51"
        onClose={onClose}
        onManual={vi.fn()}
        onPremob={vi.fn()}
      />
    )
    const { rerender } = render(renderChoice(true))
    const dialog = await screen.findByRole('dialog', { name: 'Initialize Chronology' })

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

    rerender(renderChoice(false))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
