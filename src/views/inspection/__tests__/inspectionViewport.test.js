import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetInspectionViewport } from '../form/inspectionViewport'

describe('inspection viewport reset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('scrolls and focuses the next inspection section without assuming the window scrolls', () => {
    const scrollIntoView = vi.fn()
    const focus = vi.fn()
    const target = { scrollIntoView, focus }
    vi.stubGlobal('requestAnimationFrame', (callback) => callback())

    resetInspectionViewport(target)

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
      inline: 'nearest',
    })
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})
