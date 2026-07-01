// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import FeedbackReports from '../FeedbackReports'

vi.mock('src/services/apiClient', () => ({
  fetchFeedbackReports: vi.fn(),
  fetchFeedbackReport: vi.fn(),
  updateFeedbackReport: vi.fn(),
}))

import {
  fetchFeedbackReport,
  fetchFeedbackReports,
  updateFeedbackReport,
} from 'src/services/apiClient'

const authUser = {
  id: 1,
  name: 'System Admin',
  roles: ['System Administrator'],
  permissions: ['*'],
}

const listPayload = {
  data: [
    {
      id: 8,
      message: 'The header report issue action should stay visible on tablet.',
      status: 'new',
      reporter: { id: 2, name: 'Reporter User', email: 'reporter@example.test' },
      page: { title: 'Dashboard', path: '/dashboard', search: '' },
      created_at: '2026-06-30T10:00:00Z',
      reviewed_at: null,
      reviewer: null,
    },
  ],
  meta: {
    counts: { new: 1, reviewing: 0, resolved: 0, dismissed: 0, all: 1 },
  },
}

const detailPayload = {
  data: {
    ...listPayload.data[0],
    page_context: { title: 'Dashboard', path: '/dashboard', search: '' },
    reporter_ip: '127.0.0.1',
    reporter_user_agent: 'vitest',
    admin_note: '',
  },
}

const renderPage = () => {
  const reducer = (state = { authUser }, action) =>
    action.type === 'set' ? { ...state, ...action } : state
  const store = createStore(reducer)

  render(
    <Provider store={store}>
      <MemoryRouter>
        <FeedbackReports />
      </MemoryRouter>
    </Provider>,
  )
}

describe('FeedbackReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchFeedbackReports.mockResolvedValue(listPayload)
    fetchFeedbackReport.mockResolvedValue(detailPayload)
    updateFeedbackReport.mockResolvedValue({
      data: {
        ...detailPayload.data,
        status: 'reviewing',
        admin_note: 'Investigating layout issue',
      },
    })
  })

  it('loads reports, opens detail, and saves lifecycle updates', async () => {
    renderPage()

    await waitFor(() =>
      expect(fetchFeedbackReports).toHaveBeenCalledWith({ status: 'new', per_page: 50 }),
    )
    expect(
      screen.getByText('The header report issue action should stay visible on tablet.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    await waitFor(() => expect(fetchFeedbackReport).toHaveBeenCalledWith(8))
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'reviewing' } })
    fireEvent.change(screen.getByLabelText('Admin note'), {
      target: { value: 'Investigating layout issue' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateFeedbackReport).toHaveBeenCalledWith(8, {
        status: 'reviewing',
        admin_note: 'Investigating layout issue',
      })
    })
  })
})
