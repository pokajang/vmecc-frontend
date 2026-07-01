// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import OnboardingTourPrompt from '../OnboardingTourPrompt'
import OnboardingTourTooltip from '../OnboardingTourTooltip'

afterEach(() => cleanup())

const localizedPromptCopy = {
  title: { en: 'Start tutorial?', bm: 'Mula tutorial?' },
  body: { en: 'Learn the main controls.', bm: 'Pelajari kawalan utama.' },
  preparingTitle: { en: 'Preparing tutorial...', bm: 'Menyediakan tutorial...' },
  preparingBody: { en: 'Loading anchors.', bm: 'Memuatkan anchor.' },
  notReadyTitle: { en: 'Tutorial not ready.', bm: 'Tutorial belum sedia.' },
  notReadyBody: { en: 'Try again later.', bm: 'Cuba lagi nanti.' },
  startLabel: { en: 'Start', bm: 'Mula' },
  retryLabel: { en: 'Retry', bm: 'Cuba lagi' },
  skipLabel: { en: 'Skip', bm: 'Langkau' },
}

describe('Onboarding tour primitives', () => {
  it('renders prompt fallback strings without localization metadata', () => {
    render(
      <OnboardingTourPrompt
        copy={{
          ...localizedPromptCopy,
          title: 'Start tutorial?',
          body: 'Learn the main controls.',
          startLabel: 'Start',
          skipLabel: 'Skip',
        }}
        locale="bm"
        notReady={false}
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
        onStart={vi.fn()}
        showPreparing={false}
      />,
    )

    expect(screen.getByText('Start tutorial?')).toBeTruthy()
    expect(screen.getByText('Learn the main controls.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
  })

  it('renders prompt copy in the selected locale only', () => {
    render(
      <OnboardingTourPrompt
        copy={localizedPromptCopy}
        locale="bm"
        notReady={false}
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
        onStart={vi.fn()}
        showPreparing={false}
      />,
    )

    expect(screen.getByText('Mula tutorial?')).toBeTruthy()
    expect(screen.getByText('Pelajari kawalan utama.')).toBeTruthy()
    expect(screen.queryByText('Start tutorial?')).toBeNull()
    expect(screen.getByRole('button', { name: 'Mula' })).toBeTruthy()
  })

  it('renders tooltip strings as-is when a step is not localized', () => {
    render(
      <OnboardingTourTooltip
        backProps={{ onClick: vi.fn() }}
        closeProps={{ onClick: vi.fn() }}
        continuous
        index={0}
        locale="bm"
        primaryProps={{ onClick: vi.fn() }}
        skipProps={{ onClick: vi.fn() }}
        size={3}
        step={{
          title: 'Inspection menu',
          content: 'Open Inspection here.',
        }}
        tooltipProps={{}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Inspection menu' })).toBeTruthy()
    expect(screen.getByText('Open Inspection here.')).toBeTruthy()
    expect(screen.getByText('Langkah 1 daripada 3')).toBeTruthy()
  })

  it('renders tooltip copy and actions in the selected locale only', () => {
    const onNext = vi.fn()
    render(
      <OnboardingTourTooltip
        backProps={{ onClick: vi.fn() }}
        closeProps={{ onClick: vi.fn() }}
        continuous
        index={1}
        locale="bm"
        primaryProps={{ onClick: onNext }}
        skipProps={{ onClick: vi.fn() }}
        size={3}
        step={{
          title: { en: 'Records area', bm: 'Bahagian rekod' },
          content: { en: 'Review records here.', bm: 'Semak rekod di sini.' },
        }}
        tooltipProps={{}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Bahagian rekod' })).toBeTruthy()
    expect(screen.getByText('Langkah 2 daripada 3')).toBeTruthy()
    expect(screen.getByText('Semak rekod di sini.')).toBeTruthy()
    expect(screen.queryByText('Records area')).toBeNull()
    expect(screen.getByRole('button', { name: 'Langkau' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seterusnya' }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Tutup tutorial')).toBeTruthy()
  })

  it('uses the step-specific primary action label and handler when provided', () => {
    const onPrimaryAction = vi.fn()
    const onNext = vi.fn()

    render(
      <OnboardingTourTooltip
        backProps={{ onClick: vi.fn() }}
        closeProps={{ onClick: vi.fn() }}
        continuous
        index={1}
        locale="en"
        primaryProps={{ onClick: onNext }}
        skipProps={{ onClick: vi.fn() }}
        size={2}
        step={{
          title: 'Apply leave',
          content: 'Move into the application flow.',
          primaryActionLabel: 'Continue to application',
          onPrimaryAction,
        }}
        tooltipProps={{}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue to application' }))
    expect(onPrimaryAction).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(0)
  })
})
