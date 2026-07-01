// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'

import routes from 'src/routes'

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

afterEach(() => {
  cleanup()
})

describe('inspection route ownership', () => {
  it('keeps the canonical inspection route family mounted on /inspection paths', () => {
    expect(routes.find((route) => route.path === '/inspection')).toMatchObject({
      name: 'Inspection',
    })
    expect(routes.find((route) => route.path === '/inspection/new')).toMatchObject({
      name: 'New Inspection',
    })
    expect(routes.find((route) => route.path === '/inspection/review')).toMatchObject({
      name: 'Inspection Review',
    })
    expect(routes.find((route) => route.path === '/inspection/:reportId')).toMatchObject({
      name: 'Inspection Detail',
    })
    expect(routes.find((route) => route.path === '/inspection/:reportId/edit')).toMatchObject({
      name: 'Inspection Edit',
    })
  })

  it('redirects the plain legacy report alias back to the canonical inspection root', () => {
    const LegacyRootRedirect = routes.find((route) => route.path === '/report/inspection')?.element

    render(
      <MemoryRouter initialEntries={['/report/inspection']}>
        <Routes>
          <Route path="/report/inspection" element={<LegacyRootRedirect />} />
          <Route path="/inspection" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location-path').textContent).toBe('/inspection')
  })

  it('redirects legacy inspection new-section aliases back to the canonical inspection route family', () => {
    const LegacyNewSectionRedirect = routes.find(
      (route) => route.path === '/report/inspection/new/:newSection',
    )?.element

    render(
      <MemoryRouter initialEntries={['/report/inspection/new/vehicle-kit']}>
        <Routes>
          <Route path="/report/inspection/new/:newSection" element={<LegacyNewSectionRedirect />} />
          <Route path="/inspection/new/:newSection" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new/vehicle-kit')
  })

  it('redirects legacy inspection detail aliases back to the canonical inspection detail route', () => {
    const LegacyDetailRedirect = routes.find(
      (route) => route.path === '/report/inspection/:reportId',
    )?.element

    render(
      <MemoryRouter initialEntries={['/report/inspection/inspection-1']}>
        <Routes>
          <Route path="/report/inspection/:reportId" element={<LegacyDetailRedirect />} />
          <Route path="/inspection/:reportId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location-path').textContent).toBe('/inspection/inspection-1')
  })
})
