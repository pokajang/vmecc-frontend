// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAttachment from '../hooks/useAttachment'

const putLeaveAttachmentBlob = vi.fn()
const deleteLeaveAttachmentBlob = vi.fn()

vi.mock('../leavePersistence', () => ({
  putLeaveAttachmentBlob: (...args) => putLeaveAttachmentBlob(...args),
  deleteLeaveAttachmentBlob: (...args) => deleteLeaveAttachmentBlob(...args),
}))

vi.mock('../utils', () => ({
  compressImageAttachment: vi.fn(async (file) => ({ file, wasCompressed: false })),
  formatFileSize: vi.fn(() => '1 KB'),
  isImageAttachment: vi.fn(() => false),
  isPdfAttachment: vi.fn((file) => String(file?.type || '') === 'application/pdf'),
  isSupportedAttachment: vi.fn(() => true),
}))

describe('useAttachment lifecycle safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    putLeaveAttachmentBlob.mockResolvedValue({ ok: true, attachmentId: 'temp-2' })
    deleteLeaveAttachmentBlob.mockResolvedValue({ ok: true })
  })

  it('edit + replace + cancel cleans transient only, keeps original attachment', async () => {
    const { result } = renderHook(() =>
      useAttachment({
        userId: '1',
        originalAttachmentId: 'orig-1',
      }),
    )

    act(() => {
      result.current.setAttachmentId('orig-1')
      result.current.setAttachmentName('old.pdf')
      result.current.setAttachmentMeta({ name: 'old.pdf', attachmentId: 'orig-1' })
    })

    const newFile = new File(['new-content'], 'new.pdf', { type: 'application/pdf' })
    const event = { target: { files: [newFile], value: 'x' } }

    await act(async () => {
      await result.current.handleAttachmentChange(event)
    })

    expect(result.current.attachmentId).toBe('temp-2')
    expect(deleteLeaveAttachmentBlob).not.toHaveBeenCalledWith('orig-1')

    act(() => {
      result.current.cleanupTransientOnly()
    })

    expect(deleteLeaveAttachmentBlob).toHaveBeenCalledWith('temp-2')
    expect(deleteLeaveAttachmentBlob).not.toHaveBeenCalledWith('orig-1')
  })

  it('edit + remove + submit success deletes original only on commit', async () => {
    const { result } = renderHook(() =>
      useAttachment({
        userId: '1',
        originalAttachmentId: 'orig-1',
      }),
    )

    act(() => {
      result.current.setAttachmentId('orig-1')
      result.current.setAttachmentName('old.pdf')
      result.current.setAttachmentMeta({ name: 'old.pdf', attachmentId: 'orig-1' })
      result.current.clearAttachment()
    })

    expect(deleteLeaveAttachmentBlob).not.toHaveBeenCalledWith('orig-1')

    await act(async () => {
      await result.current.commitAttachmentReplacement({
        previousAttachmentId: 'orig-1',
        nextAttachmentId: null,
      })
    })

    expect(deleteLeaveAttachmentBlob).toHaveBeenCalledWith('orig-1')
  })

  it('edit + replace + submit failure does not delete original attachment', async () => {
    const { result } = renderHook(() =>
      useAttachment({
        userId: '1',
        originalAttachmentId: 'orig-1',
      }),
    )

    act(() => {
      result.current.setAttachmentId('orig-1')
      result.current.setAttachmentName('old.pdf')
      result.current.setAttachmentMeta({ name: 'old.pdf', attachmentId: 'orig-1' })
    })

    const newFile = new File(['new-content'], 'new.pdf', { type: 'application/pdf' })
    const event = { target: { files: [newFile], value: 'x' } }

    await act(async () => {
      await result.current.handleAttachmentChange(event)
    })

    expect(result.current.attachmentId).toBe('temp-2')
    expect(deleteLeaveAttachmentBlob).not.toHaveBeenCalledWith('orig-1')
  })
})
