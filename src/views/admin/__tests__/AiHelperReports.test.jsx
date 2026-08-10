// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import AiHelperReports from '../AiHelperReports'

vi.mock('src/services/apiClient', () => ({
  fetchAiHelperReports: vi.fn(),
  fetchAiHelperReport: vi.fn(),
  updateAiHelperReport: vi.fn(),
}))

import {
  fetchAiHelperReport,
  fetchAiHelperReports,
  updateAiHelperReport,
} from 'src/services/apiClient'

const authUser = {
  id: 1,
  name: 'System Admin',
  roles: ['System Administrator'],
  permissions: ['*'],
}

const report = {
  id: 17,
  reason: 'The response did not account for the active incident workflow.',
  status: 'new',
  reporter: { id: 2, name: 'Reporter User', email: 'reporter@example.test' },
  page: { title: 'Incident Report', path: '/report/incident' },
  created_at: '2026-08-10T10:00:00Z',
  admin_note: '',
  preceding_user_content: 'What is the next required action?',
  assistant_content: 'Review the incident.',
  openai_response_id: 'resp_123',
  page_context: { path: '/report/incident' },
  chat_snapshot: { messages: [] },
}

const renderPage = () => {
  const store = createStore((state = { authUser }) => state)
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin/ai-helper-reports']}>
        <AiHelperReports />
      </MemoryRouter>
    </Provider>,
  )
}

describe('AiHelperReports', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    fetchAiHelperReports.mockResolvedValue({
      data: [report],
      meta: { counts: { new: 1, reviewing: 0, resolved: 0, dismissed: 0, all: 1 } },
    })
    fetchAiHelperReport.mockResolvedValue({ data: report })
    updateAiHelperReport.mockResolvedValue({
      data: { ...report, status: 'resolved', admin_note: 'Verified and closed' },
    })
  })

  it('uses the shared queue lifecycle without changing its API contract', async () => {
    renderPage()

    await waitFor(() =>
      expect(fetchAiHelperReports).toHaveBeenCalledWith({ status: 'new', per_page: 50 }),
    )
    expect(screen.getByRole('combobox', { name: 'Ask AI Reports status' }).options).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    await waitFor(() => expect(fetchAiHelperReport).toHaveBeenCalledWith(17))

    expect(document.getElementById('ai-report-status')).toBeTruthy()
    expect(document.getElementById('ai-report-admin-note')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'resolved' } })
    fireEvent.change(screen.getByLabelText('Admin note'), {
      target: { value: 'Verified and closed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateAiHelperReport).toHaveBeenCalledWith(17, {
        status: 'resolved',
        admin_note: 'Verified and closed',
      }),
    )
  })
})
