// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionDetailActionBar from '../records/InspectionDetailActionBar'

afterEach(() => {
  cleanup()
})

describe('InspectionDetailActionBar', () => {
  it('exposes an accessible progress state while the report is downloading', () => {
    render(
      <InspectionDetailActionBar
        record={{ id: 'inspection-1', canDownloadPdf: true }}
        onBack={vi.fn()}
        onDownloadRecord={vi.fn()}
        downloadingId="inspection-1"
        mode="desktop"
      />,
    )

    const button = screen.getByRole('button', { name: 'Downloading...' })
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('offers delete on inspection details only when the server allows it', () => {
    render(
      <InspectionDetailActionBar
        record={{
          id: 'inspection-1',
          recordActionsVersion: 1,
          recordActions: {
            delete: { applicable: true, allowed: true },
          },
        }}
        onBack={vi.fn()}
        onDeleteRecord={vi.fn()}
        canDeleteRecord={() => false}
        mode="desktop"
      />,
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })
})
