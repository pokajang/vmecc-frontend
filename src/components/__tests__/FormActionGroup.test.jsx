// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormActionGroup from '../FormActionGroup'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('FormActionGroup end docking', () => {
  it('docks at the form end and returns to floating when the end leaves the viewport', async () => {
    let anchorTop = 600
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      if (this.classList.contains('action-row-thumb-end-anchor')) {
        return { left: 12, top: anchorTop, width: 360, height: 0 }
      }
      return { left: 12, top: 650, width: 360, height: 64 }
    })

    const { container } = render(
      <FormActionGroup mobileBehavior="compact-sticky" dockAtEnd>
        <button type="button">Submit</button>
      </FormActionGroup>,
    )

    await waitFor(() => {
      expect(container.querySelector('.action-row-thumb--docked-at-end')).toBeTruthy()
    })

    anchorTop = 900
    fireEvent.scroll(window)
    await waitFor(() => {
      expect(container.querySelector('.action-row-thumb--floating')).toBeTruthy()
    })
  })
})
