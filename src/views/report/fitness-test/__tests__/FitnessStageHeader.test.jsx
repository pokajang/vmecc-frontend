// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FitnessStageHeader from '../FitnessStageHeader'

afterEach(cleanup)

describe('FitnessStageHeader', () => {
  it('exposes the active step and progress to assistive technology', () => {
    render(<FitnessStageHeader activeStep="results" />)

    expect(screen.getByRole('navigation', { name: 'Fitness report progress' })).toBeTruthy()
    expect(
      screen
        .getByRole('progressbar', { name: 'Fitness report completion' })
        .getAttribute('aria-valuenow'),
    ).toBe('3')
    expect(screen.getByText('3. Test Results').getAttribute('aria-current')).toBe('step')
  })
})
