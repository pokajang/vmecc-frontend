// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'

import InspectionUxMatrixPage from '../visual/InspectionUxMatrixPage'

const createStore = (authUser) => ({
  getState: () => ({ authUser }),
  subscribe: () => () => {},
  dispatch: () => {},
})

describe('InspectionUxMatrixPage', () => {
  it('renders the filtered matrix route for an authorized user', async () => {
    render(
      <Provider store={createStore({ permissions: ['reports.inspection.view'] })}>
        <MemoryRouter
          initialEntries={[
            '/inspection/ux-matrix?viewport=mobile&state=partial&type=fire-extinguisher-inspection',
          ]}
        >
          <InspectionUxMatrixPage />
        </MemoryRouter>
      </Provider>,
    )

    expect(screen.getByText('Inspection UX Matrix')).toBeTruthy()

    await waitFor(() => {
      expect(
        screen.getByText(
          'Capture route for the shared pre-submission inspection matrix. Use the filters to generate desktop and mobile evidence from the same fixture as the matrix tests.',
        ),
      ).toBeTruthy()
      expect(
        screen.getByText(
          'Matrix states describe the active inspection section only. Review readiness still depends on the date, time, required findings, evidence, and type-specific validation shown inside each preview.',
        ),
      ).toBeTruthy()
      expect(screen.getByText('Prompt state')).toBeTruthy()
      expect(screen.getByText('No continuation')).toBeTruthy()
    })
  })

  it('labels completion as section-scoped rather than review-ready', async () => {
    render(
      <Provider store={createStore({ permissions: ['reports.inspection.view'] })}>
        <MemoryRouter
          initialEntries={[
            '/inspection/ux-matrix?viewport=mobile&state=complete-with-next-location&type=general-inspection',
          ]}
        >
          <InspectionUxMatrixPage />
        </MemoryRouter>
      </Provider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Section complete with next location').length).toBeGreaterThan(0)
    })
  })
})
