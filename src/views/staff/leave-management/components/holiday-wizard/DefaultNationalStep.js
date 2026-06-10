import React from 'react'
import { CCol, CFormCheck, CFormInput, CRow } from '@coreui/react'

const DefaultNationalStep = ({ rows, dispatch }) => (
  <div className="d-grid gap-2">
    <div className="fw-semibold mb-2">National Holidays</div>
    <div className="text-body-secondary small mb-1">
      Select which national holidays apply and confirm their dates. Nothing is saved until final
      step.
    </div>
    <CRow className="g-2">
      <CCol md={1} className="small text-body-secondary fw-semibold text-center">
        Use
      </CCol>
      <CCol md={7} className="small text-body-secondary fw-semibold">
        Holiday Name
      </CCol>
      <CCol md={4} className="small text-body-secondary fw-semibold">
        Date
      </CCol>
    </CRow>
    {rows.map((row) => (
      <CRow className="g-2 align-items-center" key={row.key}>
        <CCol md={1} className="d-flex align-items-center justify-content-center pt-0">
          <CFormCheck
            id={`holiday-default-check-${row.key}`}
            checked={Boolean(row.applicable)}
            aria-label={`Applicable holiday for ${row.name}`}
            onChange={(event) =>
              dispatch({
                type: 'TOGGLE_NATIONAL_APPLICABLE',
                key: row.key,
                applicable: event.target.checked,
              })
            }
          />
        </CCol>
        <CCol md={7}>
          <CFormInput value={row.name} readOnly />
        </CCol>
        <CCol md={4}>
          <CFormInput
            id={`holiday-default-${row.key}`}
            type="date"
            aria-label={`Date for ${row.name}`}
            value={String(row.date || '')}
            disabled={!row.applicable}
            style={{ paddingRight: '2rem' }}
            onChange={(event) =>
              dispatch({
                type: 'SET_NATIONAL_DATE',
                key: row.key,
                date: event.target.value,
              })
            }
          />
        </CCol>
      </CRow>
    ))}
  </div>
)

export default DefaultNationalStep
