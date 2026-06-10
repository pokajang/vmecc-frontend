import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const SummaryStep = ({ wizardState }) => (
  <>
    <div className="fw-semibold mb-1">Review & confirm</div>
    <div className="text-body-secondary small mb-3">
      Everything below will be saved when you confirm.
    </div>

    <div className="rounded-3 border overflow-hidden">
      <CTable align="middle" className="mb-0" responsive>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell>Date</CTableHeaderCell>
            <CTableHeaderCell>Holiday</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Scope</CTableHeaderCell>
            <CTableHeaderCell className="text-center">State</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow style={{ backgroundColor: '#f0f4f8' }}>
            <CTableDataCell
              colSpan={4}
              style={{ lineHeight: 'inherit', fontWeight: 'normal', color: '#6c757d' }}
            >
              National Holidays
            </CTableDataCell>
          </CTableRow>
          {wizardState.defaultNationalDraft
            .filter((row) => Boolean(row.applicable))
            .map((row) => (
              <CTableRow key={`summary-national-${row.key}`}>
                <CTableDataCell>{row.date}</CTableDataCell>
                <CTableDataCell>{row.name}</CTableDataCell>
                <CTableDataCell className="text-center">National</CTableDataCell>
                <CTableDataCell className="text-center">All States</CTableDataCell>
              </CTableRow>
            ))}
          <CTableRow style={{ backgroundColor: '#f0f4f8' }}>
            <CTableDataCell
              colSpan={4}
              style={{ lineHeight: 'inherit', fontWeight: 'normal', color: '#6c757d' }}
            >
              Additional Holidays
            </CTableDataCell>
          </CTableRow>
          {wizardState.pendingAdditionalRows.length > 0 ? (
            wizardState.pendingAdditionalRows.map((row) => (
              <CTableRow key={`summary-additional-${row.id}`}>
                <CTableDataCell>{row.date}</CTableDataCell>
                <CTableDataCell>{row.name}</CTableDataCell>
                <CTableDataCell className="text-center">{row.scope}</CTableDataCell>
                <CTableDataCell className="text-center">
                  {row.scope === 'State' ? row.state : '-'}
                </CTableDataCell>
              </CTableRow>
            ))
          ) : (
            <CTableRow>
              <CTableDataCell colSpan={4} className="text-body-secondary">
                No additional holidays.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  </>
)

export default SummaryStep
