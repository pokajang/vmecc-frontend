// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import BackButton from 'src/components/BackButton'

afterEach(() => {
  cleanup()
})

const LocationProbe = () => {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}</output>
}

describe('BackButton', () => {
  it('preserves the default presentation and caller-owned click behavior', () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <BackButton onClick={onClick} />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: 'Back' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('back-button')
    expect(button.className).toContain('btn-link')
    expect(button.className).not.toContain('btn-outline')
    expect(button.className).toContain('btn-sm')
    expect(button.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('18')
    expect(button.querySelector('.lucide-arrow-left')?.getAttribute('aria-hidden')).toBe('true')
    expect(button.querySelector('.back-button__label')?.textContent).toBe('Back')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('uses the fixed destination before a fallback click handler', () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter initialEntries={['/source']}>
        <BackButton to="/target" onClick={onClick} label="Back to records" />
        <LocationProbe />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to records' }))

    expect(screen.getByLabelText('Current location').textContent).toBe('/target')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('preserves caller class, style, button props, and icon size', () => {
    render(
      <MemoryRouter>
        <BackButton
          onClick={vi.fn()}
          label="Return"
          className="consumer-back"
          style={{ minWidth: '12rem' }}
          iconSize={16}
          aria-label="Return to overview"
        />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: 'Return to overview' })
    expect(button.className).toContain('consumer-back')
    expect(button.style.minWidth).toBe('12rem')
    expect(button.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('16')
  })

  it('forwards focus refs while keeping fixed button semantics and chrome-free styling', () => {
    const backRef = React.createRef()

    render(
      <BackButton ref={backRef} onClick={vi.fn()} type="submit" color="danger" variant="outline" />,
    )

    expect(backRef.current).toBe(screen.getByRole('button', { name: 'Back' }))
    expect(backRef.current.type).toBe('button')
    expect(backRef.current.className).toContain('btn-link')
    expect(backRef.current.className).not.toContain('btn-danger')
    expect(backRef.current.className).not.toContain('btn-outline')
  })
})
