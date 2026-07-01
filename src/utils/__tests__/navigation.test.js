import { describe, expect, it } from 'vitest'
import { CNavItem, CNavTitle } from '@coreui/react'

import { PWA_INSTALL_ACTION } from 'src/constants/pwa'
import { getVisibleNavigationWithOptions } from '../navigation'

const installNav = [
  { component: CNavTitle, name: 'Home' },
  { component: CNavItem, name: 'Install VMECC', action: PWA_INSTALL_ACTION },
]

describe('navigation install visibility', () => {
  it('keeps the install nav item visible when installation is still available', () => {
    const visible = getVisibleNavigationWithOptions(installNav, null, 0, {
      showNavInstallItem: true,
    })

    expect(visible.some((item) => item.action === PWA_INSTALL_ACTION)).toBe(true)
    expect(visible.some((item) => item.name === 'Home')).toBe(true)
  })

  it('removes the install nav item when the app is already installed', () => {
    const visible = getVisibleNavigationWithOptions(installNav, null, 0, {
      showNavInstallItem: false,
    })

    expect(visible.some((item) => item.action === PWA_INSTALL_ACTION)).toBe(false)
  })
})
