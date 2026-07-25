import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import { hasPermission } from 'src/utils/authz'
import InspectionFormBodySections from '../form/components/InspectionFormBodySections'
import { INSPECTION_TYPE_DEFINITIONS } from '../app/inspectionTypeRegistry'
import {
  buildInspectionBodyCase,
  buildInspectionBodyMatrix,
  getInspectionBodyStateLabel,
  INSPECTION_BODY_STATES,
  INSPECTION_BODY_VIEWPORTS,
} from './inspectionFormStateMatrix'

const styles = `
  .inspection-ux-matrix-page {
    display: grid;
    gap: 1rem;
  }

  .inspection-ux-matrix-toolbar {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1rem;
    background:
      linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.95));
  }

  .inspection-ux-matrix-toolbar-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .inspection-ux-matrix-note {
    margin: 0;
    color: var(--cui-secondary-color, #6b7280);
  }

  .inspection-ux-matrix-grid {
    display: grid;
    gap: 1rem;
  }

  .inspection-ux-matrix-case {
    border-radius: 1rem;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  }

  .inspection-ux-matrix-case-header {
    display: grid;
    gap: 0.65rem;
    padding: 1rem 1rem 0.85rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(248, 250, 252, 0.92);
  }

  .inspection-ux-matrix-case-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .inspection-ux-matrix-preview {
    background:
      radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 38%),
      linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 1));
    padding: 1rem;
  }

  .inspection-ux-matrix-preview-shell {
    margin: 0 auto;
    width: 100%;
  }

  .inspection-ux-matrix-preview-shell[data-viewport="mobile"] {
    max-width: 430px;
  }
`

const createMockMediaQueryList = (matches, query) => ({
  matches,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})

const useForcedViewport = (viewport) => {
  const [ready, setReady] = useState(typeof window === 'undefined')

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const originalMatchMedia =
      typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null

    window.matchMedia = (query) => {
      if (String(query || '').trim() === '(max-width: 575.98px)') {
        return createMockMediaQueryList(viewport === 'mobile', query)
      }
      return originalMatchMedia ? originalMatchMedia(query) : createMockMediaQueryList(false, query)
    }

    const frame = window.requestAnimationFrame(() => {
      setReady(true)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (originalMatchMedia) {
        window.matchMedia = originalMatchMedia
      } else {
        delete window.matchMedia
      }
      setReady(false)
    }
  }, [viewport])

  return ready
}

const buildFilterSearch = ({ location, viewport, state, typeKey }) => {
  const params = new URLSearchParams(location.search)
  params.set('viewport', viewport)
  if (state && state !== 'all') {
    params.set('state', state)
  } else {
    params.delete('state')
  }
  if (typeKey && typeKey !== 'all') {
    params.set('type', typeKey)
  } else {
    params.delete('type')
  }
  return `?${params.toString()}`
}

const InspectionUxMatrixPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSelector((state) => state.authUser)
  const canViewInspection = hasPermission(user, 'reports.inspection.view')
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const viewport = INSPECTION_BODY_VIEWPORTS.includes(searchParams.get('viewport'))
    ? searchParams.get('viewport')
    : 'desktop'
  const selectedState = INSPECTION_BODY_STATES.includes(searchParams.get('state'))
    ? searchParams.get('state')
    : 'all'
  const selectedTypeKey = useMemo(() => {
    const typeKey = String(searchParams.get('type') || '').trim()
    return INSPECTION_TYPE_DEFINITIONS.some((definition) => definition.key === typeKey)
      ? typeKey
      : 'all'
  }, [searchParams])
  const viewportReady = useForcedViewport(viewport)

  const visibleEntries = useMemo(
    () =>
      buildInspectionBodyMatrix({ includeViewports: false }).filter(({ definition, state }) => {
        if (selectedState !== 'all' && state !== selectedState) return false
        if (selectedTypeKey !== 'all' && definition.key !== selectedTypeKey) return false
        return true
      }),
    [selectedState, selectedTypeKey],
  )

  const typeOptions = useMemo(
    () =>
      INSPECTION_TYPE_DEFINITIONS.map((definition) => ({
        value: definition.key,
        label: definition.title || definition.inspectionType,
      })),
    [],
  )

  const updateFilters = (nextPatch) => {
    const nextViewport = nextPatch.viewport || viewport
    const nextState = nextPatch.state ?? selectedState
    const nextTypeKey = nextPatch.typeKey ?? selectedTypeKey
    navigate(
      buildFilterSearch({
        location,
        viewport: nextViewport,
        state: nextState,
        typeKey: nextTypeKey,
      }),
      { replace: true },
    )
  }

  if (!canViewInspection) {
    return <Navigate to="/403" replace />
  }

  return (
    <section
      className="inspection-ux-matrix-page inspection-module-page"
      data-testid="inspection-ux-matrix-page"
    >
      <style>{styles}</style>
      <div className="inspection-ux-matrix-toolbar">
        <div>
          <h1 className="h4 mb-1">Inspection UX Matrix</h1>
          <p className="inspection-ux-matrix-note">
            Capture route for the shared pre-submission inspection matrix. Use the filters to
            generate desktop and mobile evidence from the same fixture as the matrix tests.
          </p>
          <p className="inspection-ux-matrix-note small mt-2">
            Matrix states describe the active inspection section only. Review readiness still
            depends on the date, time, required findings, evidence, and type-specific validation
            shown inside each preview.
          </p>
        </div>
        <div className="inspection-ux-matrix-toolbar-grid">
          <div>
            <CFormLabel htmlFor="inspection-ux-matrix-state" className="small text-body-secondary">
              State
            </CFormLabel>
            <CFormSelect
              id="inspection-ux-matrix-state"
              value={selectedState}
              onChange={(event) => updateFilters({ state: event.target.value })}
            >
              <option value="all">All states</option>
              {INSPECTION_BODY_STATES.map((state) => (
                <option key={state} value={state}>
                  {getInspectionBodyStateLabel(state)}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div>
            <CFormLabel htmlFor="inspection-ux-matrix-type" className="small text-body-secondary">
              Inspection type
            </CFormLabel>
            <CFormSelect
              id="inspection-ux-matrix-type"
              value={selectedTypeKey}
              onChange={(event) => updateFilters({ typeKey: event.target.value })}
            >
              <option value="all">All inspection types</option>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div>
            <CFormLabel className="small text-body-secondary d-block">Viewport</CFormLabel>
            <CButtonGroup>
              {INSPECTION_BODY_VIEWPORTS.map((candidate) => (
                <CButton
                  key={candidate}
                  color={candidate === viewport ? 'primary' : 'secondary'}
                  variant={candidate === viewport ? undefined : 'outline'}
                  onClick={() => updateFilters({ viewport: candidate })}
                >
                  {candidate === 'mobile' ? 'Mobile' : 'Desktop'}
                </CButton>
              ))}
            </CButtonGroup>
          </div>
        </div>
        <p className="inspection-ux-matrix-note small">
          Capture examples: <code>/inspection/ux-matrix?viewport=desktop</code> and{' '}
          <code>/inspection/ux-matrix?viewport=mobile</code>.
        </p>
      </div>

      {!viewportReady ? (
        <CCard className="inspection-ux-matrix-case">
          <CCardBody className="small text-body-secondary">
            Preparing the {viewport} preview environment.
          </CCardBody>
        </CCard>
      ) : (
        <div className="inspection-ux-matrix-grid">
          {visibleEntries.map(({ definition, state }) => {
            const { props, expectation } = buildInspectionBodyCase(definition, state)
            return (
              <CCard
                key={`${definition.key}:${state}:${viewport}`}
                className="inspection-ux-matrix-case"
                data-matrix-case={`${definition.key}:${state}:${viewport}`}
              >
                <div className="inspection-ux-matrix-case-header">
                  <div>
                    <h2 className="h6 mb-1">{definition.title || definition.inspectionType}</h2>
                    <div className="small text-body-secondary">
                      {definition.key} · {getInspectionBodyStateLabel(state)} · {viewport}
                    </div>
                  </div>
                  <div className="inspection-ux-matrix-case-meta">
                    <CBadge color={expectation.hasActions ? 'info' : 'secondary'}>
                      {expectation.hasActions ? 'Actions visible' : 'Actions hidden'}
                    </CBadge>
                    <CBadge color={expectation.hasNextLocation ? 'success' : 'secondary'}>
                      {expectation.hasNextLocation
                        ? expectation.continuationLabel
                        : 'No continuation'}
                    </CBadge>
                    {expectation.promptText ? <CBadge color="warning">Prompt state</CBadge> : null}
                  </div>
                </div>
                <div className="inspection-ux-matrix-preview">
                  <div className="inspection-ux-matrix-preview-shell" data-viewport={viewport}>
                    <InspectionFormBodySections {...props} />
                  </div>
                </div>
              </CCard>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default InspectionUxMatrixPage
