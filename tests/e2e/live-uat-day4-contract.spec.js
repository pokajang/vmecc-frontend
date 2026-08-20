const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const matrix = require('./live-uat/day4-record-matrix.json')

const root = path.resolve(__dirname, '..', '..')

test.describe('Day 4 deep-record UAT contracts', () => {
  test('locks personas, viewports, inspection types, and report types', () => {
    expect(matrix.schemaVersion).toBe(1)
    expect(matrix.expectedBuildId).toMatch(/^[0-9a-f]{12}-\d{14}$/)
    expect(matrix.personas.sort()).toEqual(['incidentCommander', 'trt'])
    expect(matrix.viewports.map(({ width, height }) => `${width}x${height}`)).toEqual([
      '360x800',
      '390x844',
      '768x1024',
      '1440x900',
    ])
    expect(matrix.inspectionTypes.map(({ key }) => key).sort()).toEqual([
      'er-aux',
      'fire-extinguisher',
      'frt-daily',
      'general',
      'high-angle',
      'hse',
      'hydraulic',
      'scba',
    ])
    expect(matrix.reportTypes.map(({ key }) => key).sort()).toEqual([
      'drill',
      'erco',
      'fitness-test',
    ])
  })

  test('keeps form and edit routes outside the live safe-route set', () => {
    expect(matrix.safeRoutes.every((route) => !/\/new|\/edit/.test(route))).toBe(true)
    expect(matrix.controlledOnlyRoutes).toEqual(
      expect.arrayContaining([
        '/inspection/new',
        '/inspection/:reportId/edit',
        '/report/:reportType/new',
      ]),
    )
  })

  test('targets the deployed detail and media owners without changing application source', () => {
    const sources = [
      'src/views/inspection/app/InspectionModuleLayout.js',
      'src/views/inspection/records/InspectionDetailReadOnly.js',
      'src/components/report-workflow/ReportPhotoGallery.js',
      'src/components/report-workflow/ReportViewComponents.js',
    ].map((relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8'))

    expect(sources[0]).toContain('inspection-detail-drawer')
    expect(sources[1]).toContain('inspection-readonly-evidence')
    expect(sources[2]).toContain('EvidencePhotoGallery')
    expect(sources[2]).toContain('src/components/media/EvidencePhotoGallery')
    expect(sources[3]).toContain('workflow-photo-preview')
  })

  test('locks the pre-Day 5 scope-recovery and divider verification gate', () => {
    const routeContext = fs.readFileSync(
      path.join(root, 'src/views/inspection/app/inspectionRecordRouteContext.js'),
      'utf8',
    )
    const liveJourney = fs.readFileSync(
      path.join(root, 'tests/e2e/live-uat/day4-deep-record.live.spec.js'),
      'utf8',
    )

    expect(routeContext).toContain("new Set(['mine', 'all', 'actionable'])")
    expect(routeContext).toContain('buildInspectionDetailLocation')
    expect(liveJourney).toContain("moduleKey === 'inspection:hse'")
    expect(liveJourney).toContain("page.reload({ waitUntil: 'domcontentloaded' })")
    expect(liveJourney).toContain('record missing after refresh')
    expect(liveJourney).toContain('detail drawer divider')
    expect(liveJourney).toContain("searchParams.get('scope')")
  })
})
