// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAttachment from '../hooks/useAttachment'

const putLeaveAttachmentBlob = vi.fn()
const deleteLeaveAttachmentBlob = vi.fn()
const mockIsImageAttachment = vi.fn(() => false)
const mockIsPdfAttachment = vi.fn((file) => String(file?.type || '') === 'application/pdf')
const mockIsSupportedAttachment = vi.fn(() => true)

vi.mock('../leavePersistence', () => ({
  putLeaveAttachmentBlob: (...args) => putLeaveAttachmentBlob(...args),
  deleteLeaveAttachmentBlob: (...args) => deleteLeaveAttachmentBlob(...args),
}))

vi.mock('../utils', () => ({
  compressImageAttachment: vi.fn(async (file) => ({ file, wasCompressed: false })),
  formatFileSize: vi.fn(() => '1 KB'),
  isImageAttachment: (...args) => mockIsImageAttachment(...args),
  isPdfAttachment: (...args) => mockIsPdfAttachment(...args),
  isSupportedAttachment: (...args) => mockIsSupportedAttachment(...args),
}))

describe('useAttachment lifecycle safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsImageAttachment.mockReturnValue(false)
    mockIsPdfAttachment.mockImplementation((file) => String(file?.type || '') === 'application/pdf')
    mockIsSupportedAttachment.mockReturnValue(true)
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

  it('marks camera upload failure with retryable state and stops toasts', async () => {
    mockIsSupportedAttachment.mockReturnValue(true)
    mockIsImageAttachment.mockReturnValue(true)
    putLeaveAttachmentBlob.mockResolvedValueOnce({
      ok: true,
      attachmentId: null,
      unsupported: true,
    })

    const { result } = renderHook(() =>
      useAttachment({
        userId: '1',
      }),
    )

    const event = {
      currentTarget: { value: 'camera-target' },
      target: {
        files: [new File(['data'], 'fire_exit.jpg', { type: 'image/jpeg' })],
        value: 'x',
      },
    }

    await act(async () => {
      await result.current.handleAttachmentChange(event, { source: 'camera' })
    })

    expect(result.current.cameraUploadFallback).not.toBeNull()
    expect(result.current.cameraUploadFallback?.message).toBeTruthy()
    expect(result.current.attachmentStatus?.tone).toBe('warning')
  })

  it('supports pdf files directly', async () => {
    mockIsSupportedAttachment.mockReturnValue(true)
    mockIsPdfAttachment.mockImplementation((file) => file?.type === 'application/pdf')
    mockIsImageAttachment.mockReturnValue(false)

    const { result } = renderHook(() =>
      useAttachment({
        userId: '1',
      }),
    )

    const pdf = new File(['pdf'], 'report.pdf', { type: 'application/pdf' })
    const event = {
      currentTarget: { value: 'manual-target' },
      target: {
        files: [pdf],
        value: 'x',
      },
    }

    await act(async () => {
      await result.current.handleAttachmentChange(event, { source: 'upload' })
    })

    expect(result.current.attachmentMeta?.name).toBe('report.pdf')
    expect(result.current.attachmentStatus?.tone).toBe('success')
    expect(result.current.attachmentMeta?.type).toBe('application/pdf')
  })
})
