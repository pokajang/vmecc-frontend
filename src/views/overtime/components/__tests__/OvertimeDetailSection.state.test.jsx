// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OvertimeDetailSection from '../OvertimeDetailSection'

afterEach(cleanup)

describe('OvertimeDetailSection state presentation', () => {
  it('keeps Back available and presents a missing record as a terminal alert', () => {
    render(
      <MemoryRouter>
        <OvertimeDetailSection selectedRecord={null} onBack={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Overtime record not found.')
  })
})
