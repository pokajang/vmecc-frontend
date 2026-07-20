import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRequestUuid } from '../api/requestUuid'

describe('createRequestUuid', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates distinct RFC 4122 version 4 values without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined)

    const first = createRequestUuid()
    const second = createRequestUuid()
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    expect(first).toMatch(uuidV4)
    expect(second).toMatch(uuidV4)
    expect(second).not.toBe(first)
  })
})
