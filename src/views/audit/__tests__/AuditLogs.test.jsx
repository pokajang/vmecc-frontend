// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'

import AuditLogs from '../AuditLogs'
import { fetchAuditLogs } from 'src/services/apiClient'

vi.mock('src/services/apiClient', () => ({
  fetchAuditLogs: vi.fn(),
}))

const renderAuditLogs = (authUser) => {
  const store = createStore((state = { authUser }) => state)

  return render(
    <Provider store={store}>
      <AuditLogs />
    </Provider>,
  )
}

const auditViewer = {
  id: 210,
  name: 'Audit Viewer',
  permissions: ['audit.view'],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AuditLogs onboarding anchors', () => {
  it('renders the required onboarding anchors for authorized users with visible records', async () => {
    fetchAuditLogs.mockResolvedValue({
      data: [
        {
          id: 1,
          created_at: '2026-06-29T10:00:00.000Z',
          action: 'user_created',
          actor: { name: 'Admin User', email: 'admin@example.test' },
          metadata: {
            role: 'Staff',
            subject: {
              name: 'New User',
              email: 'new-user@example.test',
            },
          },
          ip_address: '127.0.0.1',
        },
      ],
    })

    const { container } = renderAuditLogs(auditViewer)

    await waitFor(() => expect(screen.getAllByText('User Created').length).toBeGreaterThan(0))

    expect(container.querySelector('[data-tour-id="audit-module"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records-card"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-filters"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-results-footer"]')).toBeTruthy()
  })

  it('does not render the onboarding shell for users without audit permission', () => {
    fetchAuditLogs.mockResolvedValue({ data: [] })

    const { container } = renderAuditLogs({
      id: 211,
      name: 'No Audit Access',
      permissions: [],
    })

    expect(screen.getByText('You do not have permission to view audit logs.')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-module"]')).toBeNull()
  })

  it('keeps the root anchor contract visible during loading', () => {
    fetchAuditLogs.mockImplementation(() => new Promise(() => {}))

    const { container } = renderAuditLogs(auditViewer)

    expect(container.querySelector('[data-tour-id="audit-module"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records-card"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-filters"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records"]')).toBeTruthy()
  })

  it('keeps the root anchor contract visible when no audit logs are returned', async () => {
    fetchAuditLogs.mockResolvedValue({ data: [] })

    const { container } = renderAuditLogs(auditViewer)

    await waitFor(() => expect(screen.getByText('No audit logs found.')).toBeTruthy())

    expect(container.querySelector('[data-tour-id="audit-module"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records-card"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-filters"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records"]')).toBeTruthy()
  })

  it('keeps the root anchor contract visible when the audit request fails', async () => {
    fetchAuditLogs.mockRejectedValue({
      payload: {
        message: 'Unable to load audit logs.',
      },
    })

    const { container } = renderAuditLogs(auditViewer)

    await waitFor(() => expect(screen.getByText('Unable to load audit logs.')).toBeTruthy())

    expect(container.querySelector('[data-tour-id="audit-module"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records-card"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-filters"]')).toBeTruthy()
    expect(container.querySelector('[data-tour-id="audit-records"]')).toBeTruthy()
  })
})
