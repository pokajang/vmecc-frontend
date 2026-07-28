// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionPhotoUploadQueueStatus from '../form/components/InspectionPhotoUploadQueueStatus'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('InspectionPhotoUploadQueueStatus', () => {
  it('shows a compact batch summary and only exposes actionable failed items', () => {
    const onRetryItem = vi.fn()
    render(
      <InspectionPhotoUploadQueueStatus
        items={[
          { batchId: 'batch-1', clientUploadId: '1', fileName: 'one.jpg', status: 'uploaded' },
          { batchId: 'batch-1', clientUploadId: '2', fileName: 'two.jpg', status: 'uploaded' },
          {
            batchId: 'batch-1',
            clientUploadId: '3',
            fileName: 'three.jpg',
            status: 'uploading',
            percent: 45,
          },
          {
            batchId: 'batch-1',
            clientUploadId: '4',
            fileName: 'four.jpg',
            status: 'failed',
            failure: { message: 'The server could not decode this photo.' },
          },
          { batchId: 'batch-1', clientUploadId: '5', fileName: 'five.jpg', status: 'selected' },
        ]}
        onRetryItem={onRetryItem}
      />,
    )

    expect(screen.getByText('Uploading 2 of 5 photos…')).toBeTruthy()
    expect(screen.getByText('2 in progress · 1 needs attention')).toBeTruthy()
    expect(screen.getByText('four.jpg')).toBeTruthy()
    expect(screen.queryByText('one.jpg')).toBeNull()
    expect(screen.queryByText('three.jpg')).toBeNull()
    expect(screen.queryByRole('button', { name: /clear completed/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetryItem).toHaveBeenCalledWith('4')
  })

  it('automatically dismisses a fully successful batch', () => {
    vi.useFakeTimers()
    const onDismissCompletedBatch = vi.fn()

    render(
      <InspectionPhotoUploadQueueStatus
        items={[
          { batchId: 'batch-success', clientUploadId: '1', status: 'uploaded' },
          { batchId: 'batch-success', clientUploadId: '2', status: 'uploaded' },
        ]}
        successDismissMs={3000}
        onDismissCompletedBatch={onDismissCompletedBatch}
      />,
    )

    expect(screen.getByText('2 of 2 photos uploaded')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(onDismissCompletedBatch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismissCompletedBatch).toHaveBeenCalledWith('batch-success')
  })

  it('keeps failed batches visible instead of auto-dismissing them', () => {
    vi.useFakeTimers()
    const onDismissCompletedBatch = vi.fn()

    render(
      <InspectionPhotoUploadQueueStatus
        items={[
          { batchId: 'batch-failed', clientUploadId: '1', status: 'uploaded' },
          {
            batchId: 'batch-failed',
            clientUploadId: '2',
            fileName: 'failed.jpg',
            status: 'failed',
            failure: { message: 'Upload failed.' },
          },
        ]}
        successDismissMs={3000}
        onDismissCompletedBatch={onDismissCompletedBatch}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismissCompletedBatch).not.toHaveBeenCalled()
    expect(screen.getByText('failed.jpg')).toBeTruthy()
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })
})
