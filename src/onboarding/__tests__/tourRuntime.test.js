// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { resolveTourTarget } from 'src/onboarding/tourRuntime'

const setRect = (element, rect) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      left: rect.left,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }),
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('tourRuntime resolveTourTarget', () => {
  it('keeps offscreen targets available when a step explicitly allows them', () => {
    const target = document.createElement('button')
    target.dataset.tourId = 'offscreen-action'
    target.textContent = 'Offscreen action'
    document.body.appendChild(target)
    setRect(target, { top: -240, left: 24, width: 140, height: 40 })

    expect(
      resolveTourTarget({
        key: 'strict-step',
        targetSelector: '[data-tour-id="offscreen-action"]',
      }),
    ).toBeNull()

    expect(
      resolveTourTarget({
        key: 'offscreen-step',
        targetSelector: '[data-tour-id="offscreen-action"]',
        allowOffscreenTarget: true,
      }),
    ).toBe(target)
  })
})
