const UAT_CONTROL_STATUSES = Object.freeze([
  'automated',
  'manual',
  'not-applicable',
  'intentional-difference',
])

const sharedReportControls = ({ photos }) => ({
  1: {
    status: 'not-applicable',
    reason: 'Reports do not derive equipment issue badges from per-item inspection answers.',
  },
  2: photos
    ? {
        status: 'automated',
        evidence: 'ReportPhotoGallery component tests and responsive browser audit.',
      }
    : { status: 'not-applicable', reason: 'This report type has no photo field.' },
  3: {
    status: 'automated',
    evidence: 'Record-factory and review/detail tests cover the declared location model.',
  },
  4: photos
    ? {
        status: 'automated',
        evidence: 'Gallery and media lifecycle tests preserve photo order and description.',
      }
    : { status: 'not-applicable', reason: 'This report type has no photo hierarchy.' },
  5: {
    status: 'not-applicable',
    reason: 'Reports do not use the per-equipment general-remarks editor.',
  },
  6: {
    status: 'not-applicable',
    reason: 'Reports expose one post-analysis model and no duplicate optional/report remark pair.',
  },
  7: {
    status: 'automated',
    evidence:
      'Stage-transition tests and resetReportViewport cover stage navigation and scroll reset.',
  },
  8: {
    status: 'automated',
    evidence:
      'Review/detail tests assert the full declared location value rather than a fixed count.',
  },
  9: {
    status: 'intentional-difference',
    reason:
      'A report is one atomic business record; inspection partial-scope submission does not apply.',
  },
  10: {
    status: 'automated',
    evidence: 'Reporting workflow browser smoke verifies the last stage reaches review.',
  },
  11: {
    status: 'not-applicable',
    reason: 'Reports have sections but no equipment parent-group record hierarchy.',
  },
  12: photos
    ? {
        status: 'automated',
        evidence: 'Photo-section tests cover add/remove and blank-by-default descriptions.',
      }
    : { status: 'not-applicable', reason: 'This report type has no photo field.' },
  13: photos
    ? {
        status: 'automated',
        evidence:
          'Record factories, backend lifecycle tests, and authenticated E2E cover persistence.',
      }
    : { status: 'not-applicable', reason: 'This report type has no photo descriptions.' },
  14: {
    status: 'automated',
    evidence: 'Validation and dynamic chronology tests cover incomplete-row submission blockers.',
  },
  15: {
    status: 'not-applicable',
    reason: 'Reports do not expose inspection bulk-answer helpers.',
  },
  16: {
    status: 'not-applicable',
    reason: 'Reports navigate ordered stages, not repeated inspection scopes or locations.',
  },
})

const REPORT_MOBILE_AUDIT_MATRIX = Object.freeze([
  {
    key: 'erco',
    route: '/report/erco/new/setup',
    heading: 'ERCO',
    readyTestId: 'erco-report-setup-ready',
    capabilities: {
      supportsPhotos: true,
      photoScope: 'post-incident-analysis',
      locationModel: 'multiple-labels',
      submissionModel: 'atomic-report',
      stageNavigation: 'ordered-stages',
    },
    uatControls: sharedReportControls({ photos: true }),
  },
  {
    key: 'drill',
    route: '/report/drill/new/setup',
    heading: 'Drill',
    readyTestId: 'drill-report-setup-ready',
    capabilities: {
      supportsPhotos: true,
      photoScope: 'post-exercise-analysis',
      locationModel: 'single-label',
      submissionModel: 'atomic-report',
      stageNavigation: 'ordered-stages',
    },
    uatControls: sharedReportControls({ photos: true }),
  },
  {
    key: 'fitness-test',
    route: '/report/fitness-test/new/setup',
    heading: 'Fitness Test',
    readyTestId: 'fitness-test-report-setup-ready',
    capabilities: {
      supportsPhotos: false,
      photoScope: 'none',
      locationModel: 'single-label',
      submissionModel: 'atomic-report',
      stageNavigation: 'setup-then-form',
    },
    uatControls: sharedReportControls({ photos: false }),
  },
])

module.exports = { REPORT_MOBILE_AUDIT_MATRIX, UAT_CONTROL_STATUSES }
