import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CContainer } from '@coreui/react'
import { Navigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { hasPermission } from 'src/utils/authz'
import RouteNavTabs from 'src/components/RouteNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import TableLoader from 'src/components/TableLoader'
import ReportingWorkflowRulesEditor from './components/ReportingWorkflowRulesEditor'
import {
  REPORTING_WORKFLOW_MODULE_DEFS,
  loadReportingWorkflowRules,
  saveReportingWorkflowRules,
  resolveReportingModuleKey,
} from './reportingWorkflowStorage'

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
        setError('Saved workflow settings are unavailable. Showing defaults.')
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

  const handleSaveModuleRules = async (moduleKey, moduleRules) => {
    const payload = {
      modules: {
        ...(reportingRules?.modules || {}),
        [moduleKey]: moduleRules,
      },
    }
    const result = await saveReportingWorkflowRules(payload)
    if (!result?.ok) {
      throw result?.error || new Error('Unable to save reporting workflow rules.')
    }
    setReportingRules(result?.data || payload)
    return result.data?.modules?.[moduleKey] || moduleRules
  }

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
    <CContainer
      fluid
      className="reporting-workflow-settings"
      data-testid="reporting-settings-module"
    >
      <div className="reporting-workflow-settings__shell">
        <ModulePageHeader title="Reporting Workflow" />

        <div className="reporting-workflow-settings__nav" data-testid="reporting-settings-nav">
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
            {activeModule ? (
              <div data-testid="reporting-settings-rules">
                <ReportingWorkflowRulesEditor
                  key={activeModule.key}
                  moduleKey={activeModule.key}
                  moduleLabel={activeModule.label}
                  description={activeModule.description}
                  rules={activeModuleRules}
                  onSave={handleSaveModuleRules}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </CContainer>
  )
}

export default ReportingWorkflowSettings
