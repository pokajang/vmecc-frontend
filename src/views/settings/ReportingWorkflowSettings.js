import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import { Navigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { hasPermission } from 'src/utils/authz'
import RouteNavTabs from 'src/components/RouteNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import TableLoader from 'src/components/TableLoader'
import InspectionWorkflowRules from './components/InspectionWorkflowRules'
import {
  REPORTING_WORKFLOW_MODULE_DEFS,
  loadReportingWorkflowRules,
  resolveReportingModuleKey,
} from './reportingWorkflowStorage'

const ReadOnlyReportingWorkflowRules = ({ moduleDef, rules }) => {
  const fallback = rules?.fallback || {}
  const options = rules?.options || {}

  return (
    <CCard>
      <CCardHeader>
        <div className="fw-semibold">{moduleDef.label} Reporting Workflow</div>
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <CAlert color="info" className="mb-0">
          {moduleDef.description}
        </CAlert>
        <div className="d-grid gap-2">
          <div>
            <div className="small text-body-secondary">Review role</div>
            <div>{fallback.reviewRole || '-'}</div>
          </div>
          <div>
            <div className="small text-body-secondary">Fallback review role</div>
            <div>{fallback.fallbackReviewRole || '-'}</div>
          </div>
          <div>
            <div className="small text-body-secondary">Approval role</div>
            <div>{fallback.approveRole || '-'}</div>
          </div>
        </div>
        <div className="d-grid gap-1">
          <div className="small text-body-secondary">Options</div>
          <CListGroup>
            <CListGroupItem className="d-flex justify-content-between">
              <span>Use same-team AIC for review</span>
              <span>{options.useTeamScopedAic ? 'Yes' : 'No'}</span>
            </CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between">
              <span>Allow submission without a team</span>
              <span>{options.allowSubmitWithoutTeam ? 'Yes' : 'No'}</span>
            </CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between">
              <span>IC fallback review</span>
              <span>{options.allowIcFallbackReview ? 'Yes' : 'No'}</span>
            </CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between">
              <span>Prevent submitter self-review</span>
              <span>{options.preventSelfReview ? 'Yes' : 'No'}</span>
            </CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between">
              <span>Prevent submitter self-approval</span>
              <span>{options.preventSelfApprove ? 'Yes' : 'No'}</span>
            </CListGroupItem>
          </CListGroup>
        </div>
      </CCardBody>
    </CCard>
  )
}

const ReportingWorkflowSettings = () => {
  const authUser = useSelector((state) => state.authUser)
  const navigate = useNavigate()
  const { moduleKey: activeModuleParam } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportingRules, setReportingRules] = useState({ modules: {} })

  const activeModuleKey = resolveReportingModuleKey(activeModuleParam)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      const result = await loadReportingWorkflowRules()
      if (!active) return
      setReportingRules(result?.data || { modules: {} })
      setLoading(false)
      if (!result?.ok) {
        setError('Loaded defaults because reporting workflow settings API is unavailable.')
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const isValidRoute = useMemo(
    () => String(activeModuleParam || 'inspection') === activeModuleKey,
    [activeModuleKey, activeModuleParam],
  )

  const activeModule = useMemo(
    () => REPORTING_WORKFLOW_MODULE_DEFS.find((module) => module.key === activeModuleKey) || null,
    [activeModuleKey],
  )

  const activeModuleRules = useMemo(
    () =>
      reportingRules?.modules?.[activeModuleKey] || {
        fallback: { reviewRole: '-', fallbackReviewRole: '-', approveRole: '-' },
        options: {},
      },
    [activeModuleKey, reportingRules],
  )

  if (!authUser) {
    return (
      <div className="my-4 text-danger">
        Unable to load reporting workflow settings. Please sign in again.
      </div>
    )
  }

  if (!hasPermission(authUser, 'settings.manage')) {
    return <Navigate to="/403" replace />
  }

  if (!isValidRoute) {
    return <Navigate to="/reporting-settings/inspection" replace />
  }

  return (
    <CContainer fluid data-testid="reporting-settings-module">
      <ModulePageHeader
        title="Reporting Settings"
        subtitle="Configure reporting workflow policies across inspection and other report modules."
      />

      <div data-testid="reporting-settings-nav">
        <RouteNavTabs
          currentPath={`/reporting-settings/${activeModuleKey}`}
          navigate={(path) => navigate(path)}
          items={REPORTING_WORKFLOW_MODULE_DEFS.map((moduleDef) => ({
            key: moduleDef.key,
            label: moduleDef.label,
            to: moduleDef.path,
            match: `/reporting-settings/${moduleDef.key}`,
          }))}
        />
      </div>

      {loading ? (
        <TableLoader />
      ) : (
        <>
          {error ? <CAlert color="warning">{error}</CAlert> : null}
          {activeModuleKey === 'inspection' && (
            <div data-testid="reporting-settings-rules">
              <InspectionWorkflowRules />
            </div>
          )}
          {activeModuleKey !== 'inspection' && activeModule ? (
            <div data-testid="reporting-settings-rules">
              <ReadOnlyReportingWorkflowRules moduleDef={activeModule} rules={activeModuleRules} />
            </div>
          ) : null}
        </>
      )}
    </CContainer>
  )
}

export default ReportingWorkflowSettings
