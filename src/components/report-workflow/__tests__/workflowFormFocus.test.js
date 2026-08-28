// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { focusFirstInvalidField } from '../workflowFormFocus'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('focusFirstInvalidField', () => {
  it('opens a collapsed disclosure, scrolls, and focuses the first invalid control', () => {
    document.body.innerHTML =
      '<form><details><input aria-invalid="true" /><input aria-invalid="true" /></details></form>'
    const root = document.querySelector('form')
    const details = document.querySelector('details')
    const firstInput = document.querySelector('input')
    firstInput.scrollIntoView = vi.fn()
    firstInput.focus = vi.fn()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })

    expect(focusFirstInvalidField(root)).toBe(true)
    expect(details.open).toBe(true)
    expect(firstInput.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
    expect(firstInput.focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})
