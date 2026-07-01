// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CNavItem } from '@coreui/react'
import { Download, LayoutDashboard } from 'lucide-react'

import { AppSidebarNav } from '../AppSidebarNav'
import { PWA_INSTALL_ACTION } from 'src/constants/pwa'

afterEach(() => cleanup())

describe('AppSidebarNav', () => {
  it('renders action items as clickable buttons and dispatches the action', () => {
    const onAction = vi.fn()

    render(
      <MemoryRouter>
        <AppSidebarNav
          onAction={onAction}
          items={[
            {
              component: CNavItem,
              name: 'Install VMECC',
              action: PWA_INSTALL_ACTION,
              icon: <Download className="nav-icon" size={20} />,
            },
          ]}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Install VMECC' }))
    expect(onAction).toHaveBeenCalledWith(
      PWA_INSTALL_ACTION,
      expect.objectContaining({ name: 'Install VMECC', action: PWA_INSTALL_ACTION }),
    )
  })

  it('keeps ordinary navigation items working as links', () => {
    render(
      <MemoryRouter>
        <AppSidebarNav
          items={[
            {
              component: CNavItem,
              name: 'Dashboard',
              to: '/dashboard',
              icon: <LayoutDashboard className="nav-icon" size={20} />,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/dashboard')
  })
})
