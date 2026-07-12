import { describe, expect, it } from 'vitest'
import { canLoadMessageThreads } from '../messageAccess'

const userWithMessages = { permissions: ['self.messages'] }

describe('message access', () => {
  it('waits for module activation before loading message threads', () => {
    expect(
      canLoadMessageThreads(userWithMessages, {
        hydrated: false,
        effective: {},
      }),
    ).toBe(false)
  })

  it('does not load threads when messages are disabled', () => {
    expect(
      canLoadMessageThreads(userWithMessages, {
        hydrated: true,
        effective: { messages: { enabled: false } },
      }),
    ).toBe(false)
  })

  it('requires both an enabled module and self.messages permission', () => {
    const activation = {
      hydrated: true,
      effective: { messages: { enabled: true } },
    }

    expect(canLoadMessageThreads(userWithMessages, activation)).toBe(true)
    expect(canLoadMessageThreads({ permissions: [] }, activation)).toBe(false)
  })
})
