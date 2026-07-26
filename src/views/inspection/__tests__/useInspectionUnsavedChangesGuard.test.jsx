// @vitest-environment jsdom
import React, { useCallback } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import useInspectionUnsavedChangesGuard from '../state/useInspectionUnsavedChangesGuard'

afterEach(() => cleanup())

const Harness = ({ dirty }) => {
  useInspectionUnsavedChangesGuard(
    useCallback(() => dirty, [dirty]),
    {
      id: 'inspection-test',
    },
  )
  const { isBlocked } = useNavigationGuard()
  return <span>{isBlocked ? 'blocked' : 'safe'}</span>
}

describe('inspection unsaved changes guard', () => {
  it('registers inspection dirty state with the shared navigation guard', async () => {
    const view = render(
      <MemoryRouter>
        <NavigationGuardProvider>
          <Harness dirty />
        </NavigationGuardProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('blocked')).toBeTruthy())

    view.rerender(
      <MemoryRouter>
        <NavigationGuardProvider>
          <Harness dirty={false} />
        </NavigationGuardProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('safe')).toBeTruthy())
  })
})
