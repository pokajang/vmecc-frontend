import React from 'react'
import Reports from 'src/views/report/Reports'
import InspectionForm from './InspectionForm'

const INSPECTION_TYPE_META = { label: 'Inspection', idPrefix: 'INS' }

const InspectionLegacyHost = () => {
  return (
    <Reports
      overrideReportType="inspection"
      overrideBasePath="/inspection"
      formComponent={InspectionForm}
      reportTypeMeta={INSPECTION_TYPE_META}
    />
  )
}

export default InspectionLegacyHost
