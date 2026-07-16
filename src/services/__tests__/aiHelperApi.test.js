import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { streamAiHelperMessage } from '../api/aiHelperApi'
import { setCsrfToken } from '../api/httpClient'

const streamResponse = (chunks) => {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
        controller.close()
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    },
  )
}

describe('aiHelperApi streaming parser', () => {
  beforeEach(() => {
    setCsrfToken('test-token')
    vi.restoreAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  afterEach(() => {
    setCsrfToken(null)
  })

  it('parses meta, delta, and done server-sent events', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'event: meta\ndata: {"thread":{"id":1}}\n\n',
            'event: status\ndata: {"status":"verifying","message":"Checking sources..."}\n\n',
            'event: delta\ndata: {"text":"Hello"}\n\n',
            'event: delta\ndata: {"text":" world"}\n\n',
            'event: done\ndata: {"message":{"id":9,"content":"Hello world"}}\n\n',
          ]),
        ),
    )
    const events = []

    await streamAiHelperMessage(
      { message: 'Hi' },
      {
        onMeta: (payload) => events.push(['meta', payload.thread.id]),
        onStatus: (payload) => events.push(['status', payload.status]),
        onDelta: (payload) => events.push(['delta', payload.text]),
        onDone: (payload) => events.push(['done', payload.message.content]),
      },
    )

    expect(events).toEqual([
      ['meta', 1],
      ['status', 'verifying'],
      ['delta', 'Hello'],
      ['delta', ' world'],
      ['done', 'Hello world'],
    ])
  })

  it('parses heartbeat events without completing the stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'event: meta\ndata: {"request_id":"req-1"}\n\n',
            'event: heartbeat\ndata: {"request_id":"req-1","at":"2026-06-25T00:00:00Z"}\n\n',
            'event: delta\ndata: {"request_id":"req-1","text":"Ready"}\n\n',
            'event: done\ndata: {"request_id":"req-1","message":{"id":9,"content":"Ready"}}\n\n',
          ]),
        ),
    )
    const events = []

    await streamAiHelperMessage(
      { message: 'Hi' },
      {
        onMeta: (payload) => events.push(['meta', payload.request_id]),
        onHeartbeat: (payload) => events.push(['heartbeat', payload.request_id]),
        onDelta: (payload) => events.push(['delta', payload.request_id, payload.text]),
        onDone: (payload) => events.push(['done', payload.request_id, payload.message.content]),
      },
    )

    expect(events).toEqual([
      ['meta', 'req-1'],
      ['heartbeat', 'req-1'],
      ['delta', 'req-1', 'Ready'],
      ['done', 'req-1', 'Ready'],
    ])
  })

  it('throws a useful error for non-stream JSON failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'AI helper is not configured.' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await expect(streamAiHelperMessage({ message: 'Hi' })).rejects.toThrow(
      'AI helper is not configured.',
    )
  })

  it('ignores malformed trailing buffers after a completed event', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'event: delta\ndata: {"text":"Hello"}\n\n',
            'event: done\ndata: {"message":{"id":9,"content":"Hello"}}\n\n',
            'not a complete event',
          ]),
        ),
    )
    const events = []

    await streamAiHelperMessage(
      { message: 'Hi' },
      {
        onDelta: (payload) => events.push(['delta', payload.text]),
        onDone: (payload) => events.push(['done', payload.message.content]),
        onError: (payload) => events.push(['error', payload?.message]),
      },
    )

    expect(events).toEqual([
      ['delta', 'Hello'],
      ['done', 'Hello'],
    ])
  })

  it('throws when a stream ends before done or error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(streamResponse(['event: delta\ndata: {"text":"Hello"}\n\n'])),
    )

    await expect(streamAiHelperMessage({ message: 'Hi' })).rejects.toThrow(
      'Ask AI stream ended before the response finished.',
    )
  })

  it('survives malformed SSE JSON payloads and still processes terminal events', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'event: delta\ndata: not-json\n\n',
            'event: delta\ndata: {"text":"works"}\n\n',
            'event: done\ndata: {"message":{"id":12,"content":"works"}}\n\n',
          ]),
        ),
    )
    const events = []
    const parseErrors = []

    await streamAiHelperMessage(
      { message: 'Hi' },
      {
        onDelta: (payload) => events.push(payload),
        onDone: (payload) => events.push(payload.message),
        onRawError: (error, payload) => parseErrors.push([error.message, payload.message]),
      },
    )

    expect(parseErrors).toHaveLength(1)
    expect(parseErrors[0][0]).toBe('Malformed SSE payload segment.')
    expect(events).toEqual([
      { message: 'not-json' },
      { text: 'works' },
      { id: 12, content: 'works' },
    ])
  })

  it('returns incomplete-stream errors for heartbeat-only responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'event: heartbeat\ndata: {"request_id":"req-heart"}\n\n',
            'event: heartbeat\ndata: {"request_id":"req-heart","at":"2026-06-25T00:00:00Z"}\n\n',
          ]),
        ),
    )

    await expect(streamAiHelperMessage({ message: 'Hi' })).rejects.toThrow(
      'Ask AI stream ended before the response finished.',
    )
  })
})
