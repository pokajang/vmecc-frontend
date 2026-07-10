// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import KnowledgeListView from '../KnowledgeListView'

vi.mock('@coreui/react', async () => {
  const actual = await vi.importActual('@coreui/react')
  return {
    ...actual,
    CTooltip: ({ children }) => children,
  }
})

afterEach(() => {
  cleanup()
})

describe('KnowledgeListView', () => {
  HTMLElement.prototype.scrollIntoView = vi.fn()

  const entry = {
    id: 42,
    title: 'Inspection guide',
    source_filename: 'inspection-guide.pdf',
    summary: 'Inspection summary',
    scope_type: 'global',
    visibility: 'personal',
    review_status: 'approved',
    status: 'active',
    active: true,
    uploaded_by: 7,
    uploader_name: 'Jang',
    created_at: '2026-06-24T00:00:00Z',
    source_size: 3072,
    processing_warnings: [],
  }

  it('opens a knowledge entry from the list card', () => {
    const handleOpen = vi.fn()

    render(
      <KnowledgeListView
        authUser={{ id: 7 }}
        canManageKnowledge={false}
        knowledgeDeleteTarget={null}
        knowledgeEntries={[entry]}
        knowledgeInitialLoading={false}
        knowledgeLoading={false}
        knowledgeUpdatingId={null}
        onConfirmDeleteKnowledge={vi.fn()}
        onKnowledgeDeleteTargetChange={vi.fn()}
        onLoadKnowledge={vi.fn()}
        onOpenKnowledge={handleOpen}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /open inspection guide/i }))

    expect(handleOpen).toHaveBeenCalledWith(42)
  })

  it('does not open the knowledge entry when deleting', () => {
    const handleOpen = vi.fn()
    const handleDeleteTarget = vi.fn()

    render(
      <KnowledgeListView
        authUser={{ id: 7 }}
        canManageKnowledge={false}
        knowledgeDeleteTarget={null}
        knowledgeEntries={[entry]}
        knowledgeInitialLoading={false}
        knowledgeLoading={false}
        knowledgeUpdatingId={null}
        onConfirmDeleteKnowledge={vi.fn()}
        onKnowledgeDeleteTargetChange={handleDeleteTarget}
        onLoadKnowledge={vi.fn()}
        onOpenKnowledge={handleOpen}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /delete inspection guide/i }))

    expect(handleDeleteTarget).toHaveBeenCalledWith(entry)
    expect(handleOpen).not.toHaveBeenCalled()
  })

  it('allows system administrators to delete markdown uploaded by another user', () => {
    const handleDeleteTarget = vi.fn()
    const markdownEntry = {
      ...entry,
      id: 99,
      title: 'Shared guidance',
      source_filename: 'shared-guidance.md',
      source_mime: 'text/markdown',
      uploaded_by: 13,
    }

    render(
      <KnowledgeListView
        authUser={{ id: 7 }}
        canManageKnowledge
        knowledgeDeleteTarget={null}
        knowledgeEntries={[markdownEntry]}
        knowledgeInitialLoading={false}
        knowledgeLoading={false}
        knowledgeUpdatingId={null}
        onConfirmDeleteKnowledge={vi.fn()}
        onKnowledgeDeleteTargetChange={handleDeleteTarget}
        onLoadKnowledge={vi.fn()}
        onOpenKnowledge={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /delete shared guidance/i }))

    expect(handleDeleteTarget).toHaveBeenCalledWith(markdownEntry)
  })

  it('scrolls the confirmation prompt into view when a delete target is set', () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

    const { rerender } = render(
      <KnowledgeListView
        authUser={{ id: 7 }}
        canManageKnowledge={false}
        knowledgeDeleteTarget={null}
        knowledgeEntries={[entry]}
        knowledgeInitialLoading={false}
        knowledgeLoading={false}
        knowledgeUpdatingId={null}
        onConfirmDeleteKnowledge={vi.fn()}
        onKnowledgeDeleteTargetChange={vi.fn()}
        onLoadKnowledge={vi.fn()}
        onOpenKnowledge={vi.fn()}
      />,
    )

    rerender(
      <KnowledgeListView
        authUser={{ id: 7 }}
        canManageKnowledge={false}
        knowledgeDeleteTarget={entry}
        knowledgeEntries={[entry]}
        knowledgeInitialLoading={false}
        knowledgeLoading={false}
        knowledgeUpdatingId={null}
        onConfirmDeleteKnowledge={vi.fn()}
        onKnowledgeDeleteTargetChange={vi.fn()}
        onLoadKnowledge={vi.fn()}
        onOpenKnowledge={vi.fn()}
      />,
    )

    const confirmation = screen.getByRole('group', {
      name: 'Delete Inspection guide confirmation',
    })

    expect(confirmation.closest('.ai-helper-knowledge__item')).toBeTruthy()

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })
})
