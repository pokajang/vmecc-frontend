// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowAttachmentField from '../WorkflowAttachmentField'

afterEach(cleanup)

describe('WorkflowAttachmentField', () => {
  it('normalizes file selection while preserving optional camera and remove actions', () => {
    const onFileSelect = vi.fn()
    const onCamera = vi.fn()
    const onRemove = vi.fn()
    const file = new File(['evidence'], 'evidence.pdf', { type: 'application/pdf' })

    render(
      <WorkflowAttachmentField
        id="evidence"
        label="Evidence"
        accept="application/pdf"
        onFileSelect={onFileSelect}
        onCamera={onCamera}
        onRemove={onRemove}
        hasAttachment
        error="Upload failed."
      />,
    )

    fireEvent.change(screen.getByLabelText('Evidence (optional)'), { target: { files: [file] } })
    expect(screen.getByRole('button', { name: 'Replace attachment' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Use camera' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }))

    expect(onFileSelect).toHaveBeenCalledWith(file)
    expect(onCamera).toHaveBeenCalledOnce()
    expect(onRemove).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert').textContent).toContain('Upload failed.')
  })

  it('uses a visible product action to activate the hidden native input', () => {
    render(
      <WorkflowAttachmentField
        id="supporting-file"
        label="Supporting file"
        accept="application/pdf"
        onFileSelect={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Supporting file (optional)')
    const clickSpy = vi.spyOn(input, 'click')
    expect(input.classList.contains('visually-hidden')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Add attachment' }))
    expect(clickSpy).toHaveBeenCalledOnce()
  })
})
