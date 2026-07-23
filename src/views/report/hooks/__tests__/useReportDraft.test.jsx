// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRef, useState } from 'react'
import useReportDraft from '../useReportDraft'

describe('useReportDraft', () => {
  it('never hydrates a draft after a mounted blank session stops receiving skipDraftLoad', async () => {
    const loadDraft = vi.fn(async () => ({ incidentType: 'Stale saved drill' }))

    const { result, rerender } = renderHook(
      ({ skipDraftLoad }) => {
        const [form, setForm] = useState({ incidentType: '' })
        const draftLoadedRef = useRef(false)
        useReportDraft({
          userId: 7,
          reportTypeSlug: 'drill',
          draftLoadedRef,
          setForm,
          skipDraftLoad,
          loadDraft,
        })
        return form
      },
      { initialProps: { skipDraftLoad: true } },
    )

    await act(async () => {
      rerender({ skipDraftLoad: false })
      await Promise.resolve()
    })

    expect(loadDraft).not.toHaveBeenCalled()
    expect(result.current.incidentType).toBe('')
  })

  it('does not cancel hydration when inline lifecycle callbacks change identity', async () => {
    let resolveDraft
    const pendingDraft = new Promise((resolve) => {
      resolveDraft = resolve
    })
    const loadDraft = vi.fn(() => pendingDraft)
    const firstLoaded = vi.fn()
    const latestLoaded = vi.fn()
    const settled = vi.fn()

    const { result, rerender } = renderHook(
      ({ callbackVersion }) => {
        const [form, setForm] = useState({ incidentType: '' })
        const draftLoadedRef = useRef(false)
        useReportDraft({
          userId: 7,
          reportTypeSlug: 'erco',
          draftLoadedRef,
          setForm,
          loadDraft: () => loadDraft(),
          normalizeDraft: (draft) => ({ ...draft }),
          onDraftLoaded: callbackVersion === 1 ? firstLoaded : latestLoaded,
          onDraftLoadSettled: settled,
          pushToast: vi.fn(),
        })
        return form
      },
      { initialProps: { callbackVersion: 1 } },
    )

    rerender({ callbackVersion: 2 })
    await act(async () => {
      resolveDraft({ incidentType: 'Fire', setupConfirmed: true })
      await pendingDraft
    })

    await waitFor(() => expect(result.current.incidentType).toBe('Fire'))
    expect(loadDraft).toHaveBeenCalledTimes(1)
    expect(firstLoaded).not.toHaveBeenCalled()
    expect(latestLoaded).toHaveBeenCalledTimes(1)
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('settles an empty server response so guarded routes can canonicalize', async () => {
    const settled = vi.fn()
    renderHook(() => {
      const [, setForm] = useState({})
      const draftLoadedRef = useRef(false)
      useReportDraft({
        userId: 7,
        reportTypeSlug: 'erco',
        draftLoadedRef,
        setForm,
        loadDraft: async () => null,
        onDraftLoadSettled: settled,
      })
    })

    await waitFor(() => expect(settled).toHaveBeenCalledTimes(1))
  })
})
