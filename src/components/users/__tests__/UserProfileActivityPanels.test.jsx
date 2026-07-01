// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserAuditPanel from '../UserAuditPanel'
import UserSessionsPanel from '../UserSessionsPanel'
import { fetchAuditLogs, fetchUserSessions, revokeUserSession } from 'src/services/apiClient'

vi.mock('src/services/apiClient', () => ({
  fetchAuditLogs: vi.fn(),
  fetchUserSessions: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  revokeUserSession: vi.fn(),
}))

vi.mock('src/utils/exportXlsx', () => ({
  exportWorkbook: vi.fn(),
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('user profile activity panels', () => {
  it('renders audit activity through mobile records and desktop table', async () => {
    fetchAuditLogs.mockResolvedValue({
      data: [
        {
          id: 'audit-1',
          action: 'user_locked',
          created_at: '2026-04-15T10:00:00.000Z',
          actor: { name: 'System Admin' },
          ip_address: '127.0.0.1',
        },
      ],
    })

    const { container } = render(<UserAuditPanel userId={1} />)

    const auditTitles = await screen.findAllByText('User Locked')
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeTruthy()

    const mobileArticle = auditTitles.find((title) => title.closest('article'))?.closest('article')
    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(mobileArticle.className).toContain('list-group-item')
    expect(mobileArticle.textContent).toContain('System Admin')
    expect(mobileArticle.textContent).toContain('127.0.0.1')

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('User Locked'),
    )
    expect(desktopRow.textContent).toContain('System Admin')
  })

  it('renders sessions through mobile records and keeps revoke behavior', async () => {
    fetchUserSessions.mockResolvedValue({
      data: [
        {
          id: 'session-1',
          active: true,
          ip_address: '10.0.0.1',
          user_agent: 'Chrome on Windows',
          created_at: '2026-04-15T10:00:00.000Z',
          last_seen_at: '2026-04-15T11:00:00.000Z',
          expires_at: '2026-04-16T10:00:00.000Z',
        },
      ],
    })
    revokeUserSession.mockResolvedValue({})

    render(<UserSessionsPanel userId={1} />)

    const sessionTitles = await screen.findAllByText('10.0.0.1')
    const mobileArticle = sessionTitles
      .find((title) => title.closest('article'))
      ?.closest('article')
    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(mobileArticle.className).toContain('list-group-item')
    expect(mobileArticle.textContent).toContain('Chrome on Windows')
    expect(mobileArticle.textContent).toContain('Active')

    fireEvent.click(within(mobileArticle).getByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(revokeUserSession).toHaveBeenCalledWith(1, 'session-1', 'admin_revoked')
    })
  })
})
