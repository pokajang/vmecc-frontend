// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import TeamCard from '../TeamCard'

afterEach(() => cleanup())

const team = {
  id: 1,
  name: 'Alpha',
  members: [{ id: 11, name: 'Ava Chen', role: 'Incident Commander' }],
}

it('opens the team from keyboard activation on the open region', () => {
  const handleView = vi.fn()

  render(<TeamCard team={team} status="Scheduled" onView={handleView} onEdit={vi.fn()} />)

  const openRegions = screen.getAllByRole('button', { name: 'Open team Alpha' })
  expect(openRegions).toHaveLength(1)

  fireEvent.keyDown(openRegions[0], { key: 'Enter' })
  fireEvent.keyDown(openRegions[0], { key: ' ' })

  expect(handleView).toHaveBeenCalledTimes(2)
})

it('keeps edit as a separate button that does not open the card', () => {
  const handleView = vi.fn()
  const handleEdit = vi.fn()

  render(<TeamCard team={team} status="Scheduled" onView={handleView} onEdit={handleEdit} />)

  fireEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }))

  expect(handleEdit).toHaveBeenCalledTimes(1)
  expect(handleView).not.toHaveBeenCalled()
})
