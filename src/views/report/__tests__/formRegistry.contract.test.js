import { describe, expect, it } from 'vitest'
import navigation from 'src/_nav'
import { REPORT_TYPE_CONFIG, REPORT_VIEW_PERMISSIONS } from 'src/views/report/constants'
import { FORM_REGISTRY } from 'src/views/report/formRegistry'
import { REPORTING_WORKFLOW_MODULE_DEFS } from 'src/views/settings/reportingWorkflowStorage'
import auditMatrixModule from '../../../../tests/e2e/support/report-mobile-audit-matrix.js'

const { REPORT_MOBILE_AUDIT_MATRIX, UAT_CONTROL_STATUSES } = auditMatrixModule
const sorted = (values) => [...values].sort()
const reportKeys = sorted(Object.keys(FORM_REGISTRY))
const auditKeys = () => REPORT_MOBILE_AUDIT_MATRIX.map((module) => module.key)

describe('report type registration contract', () => {
  it('keeps runtime, metadata, permission, workflow, navigation, and audit keys aligned', () => {
    expect(
      sorted(Object.keys(REPORT_TYPE_CONFIG)),
      'REPORT_TYPE_CONFIG must declare every registered report form',
    ).toEqual(reportKeys)
    expect(
      sorted(Object.keys(REPORT_VIEW_PERMISSIONS)),
      'REPORT_VIEW_PERMISSIONS must declare every registered report form',
    ).toEqual(reportKeys)
    expect(
      sorted(auditKeys()),
      'The mobile audit matrix must declare every registered report form',
    ).toEqual(reportKeys)

    const workflowKeys = REPORTING_WORKFLOW_MODULE_DEFS.filter(
      (module) => module.key !== 'inspection',
    ).map((module) => module.key)
    expect(
      sorted(workflowKeys),
      'Reporting workflow settings must declare every registered report form',
    ).toEqual(reportKeys)

    const navigationKeys = navigation
      .map((item) => /^\/report\/([^/]+)$/.exec(String(item.to || ''))?.[1] || '')
      .filter(Boolean)
    expect(
      sorted(navigationKeys),
      'Sidebar navigation must link every registered report form',
    ).toEqual(reportKeys)
  })

  it('requires stable responsive selectors and an explicit capability contract', () => {
    const readyIds = new Set()
    for (const module of REPORT_MOBILE_AUDIT_MATRIX) {
      expect(module.route, `${module.key} requires a setup route`).toBe(
        `/report/${module.key}/new/setup`,
      )
      expect(module.heading, `${module.key} requires a heading matcher`).toBeTruthy()
      expect(module.readyTestId, `${module.key} requires a stable setup-ready test ID`).toBeTruthy()
      expect(
        readyIds.has(module.readyTestId),
        `${module.key} setup-ready test ID must be unique`,
      ).toBe(false)
      readyIds.add(module.readyTestId)

      expect(['multiple-labels', 'single-label']).toContain(module.capabilities.locationModel)
      expect(module.capabilities.submissionModel).toBe('atomic-report')
      expect(typeof module.capabilities.supportsPhotos).toBe('boolean')
      expect(module.capabilities.photoScope).toBeTruthy()
      expect(module.capabilities.stageNavigation).toBeTruthy()
    }
  })

  it('classifies all 16 UAT concerns before a report type can be registered', () => {
    const requiredConcernNumbers = Array.from({ length: 16 }, (_, index) => String(index + 1))

    for (const module of REPORT_MOBILE_AUDIT_MATRIX) {
      expect(
        sorted(Object.keys(module.uatControls || {})),
        `${module.key} must classify every UAT concern from 1 through 16`,
      ).toEqual(sorted(requiredConcernNumbers))

      for (const concernNumber of requiredConcernNumbers) {
        const control = module.uatControls[concernNumber]
        expect(
          UAT_CONTROL_STATUSES,
          `${module.key} concern ${concernNumber} has an unsupported status`,
        ).toContain(control.status)
        expect(
          String(control.evidence || control.reason || '').trim(),
          `${module.key} concern ${concernNumber} requires evidence or a reason`,
        ).not.toBe('')
      }
    }
  })
})
