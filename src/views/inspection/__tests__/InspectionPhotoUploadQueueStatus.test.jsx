// @vitest-environment jsdom
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InspectionPhotoUploadQueueStatus from '../form/components/InspectionPhotoUploadQueueStatus'

describe('InspectionPhotoUploadQueueStatus', () => {
  it('shows all five selected files and exposes retry for the failed item', () => {
    const onRetryItem = vi.fn()
    render(
      <InspectionPhotoUploadQueueStatus
        items={[
          { clientUploadId: '1', fileName: 'one.jpg', status: 'uploaded' },
          { clientUploadId: '2', fileName: 'two.jpg', status: 'uploaded' },
          { clientUploadId: '3', fileName: 'three.jpg', status: 'uploading', percent: 45 },
          {
            clientUploadId: '4',
            fileName: 'four.jpg',
            status: 'failed',
            failure: { message: 'The server could not decode this photo.' },
          },
          { clientUploadId: '5', fileName: 'five.jpg', status: 'selected' },
        ]}
        onRetryItem={onRetryItem}
      />,
    )

    expect(screen.getByText('5 photos selected')).toBeTruthy()
    expect(screen.getByText(/2 uploaded · 2 in progress · 1 need attention/)).toBeTruthy()
    for (const fileName of ['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg', 'five.jpg']) {
      expect(screen.getByText(fileName)).toBeTruthy()
    }

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetryItem).toHaveBeenCalledWith('4')
  })
})
