// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import AttachmentPreviewModal from '../AttachmentPreviewModal'

vi.mock('src/views/payroll/components/attachmentUtils', () => ({
  downloadAttachmentPayload: vi.fn(),
  downloadWorkflowAttachmentToBrowser: vi.fn(),
  extractAttachmentPayload: (attachment) => attachment,
  loadWorkflowAttachmentForPreview: vi.fn(),
}))

afterEach(() => cleanup())

describe('AttachmentPreviewModal privacy', () => {
  it('does not retain attachment metadata or preview content while closed', () => {
    render(
      <AttachmentPreviewModal
        visible={false}
        attachment={{
          attachmentId: 55,
          attachmentName: 'private-payslip.pdf',
          attachmentDataUrl: 'data:application/pdf;base64,PRIVATE',
          attachmentMimeType: 'application/pdf',
        }}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('private-payslip.pdf')).toBeNull()
    expect(screen.queryByTitle('private-payslip.pdf')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
