// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import InspectionDetailSection from '../InspectionDetailSection'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'

afterEach(() => {
  cleanup()
})

const expectItemizedReadOnlyFindings = () => {
  const section = screen.getByText('Inspection Findings').closest('section')
  expect(
    section?.querySelectorAll('.inspection-detail-finding-accordion-item').length || 0,
  ).toBeGreaterThan(0)
  expect(section?.querySelector('input, textarea, select')).toBeNull()
  ;['Save', 'Reset', 'Add equipment', 'Mark all OK', 'Search'].forEach((label) => {
    expect(within(section).queryByRole('button', { name: label })).toBeNull()
  })
}

describe('InspectionDetailSection', () => {
  it('renders General Inspection findings and optional evidence in read-only detail mode', () => {
    const { container } = render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-general-detail-1',
          displayId: 'INSP-GEN-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-28T10:00:00.000Z',
          submittedBy: 'Inspector General',
          location: 'Zone A',
          selectedLocation: 'Zone A',
          mainLocation: 'Zone A',
          incidentType: 'General Inspection',
          description: 'General inspection summary for Zone A.',
          reportRemarks: 'Whole area was accessible except the west stairwell.',
          inspectionIssues: [
            {
              id: 'finding-1',
              description: 'Blocked access near Zone A.',
              actionRequired: 'Clear stored items.',
              photos: [],
            },
          ],
          checklist: [
            { id: 'housekeeping', label: 'Housekeeping checked', selected: true },
            { id: 'access', label: 'Access clear', selected: true },
          ],
          photos: [
            {
              id: 'general-photo-1',
              fileName: 'general.jpg',
              description: 'General evidence photo',
              url: 'data:image/png;base64,abc123',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.className || '').toContain('inspection-detail-section')
    expect(wrapper?.className || '').not.toContain('inspection-mobile-section')

    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByText('Housekeeping checked')).toBeNull()
    expect(screen.queryByText('Access clear')).toBeNull()
    expect(screen.queryByText('Describe')).toBeNull()
    expect(screen.queryByText('General inspection summary for Zone A.')).toBeNull()
    expect(screen.getByText('Findings')).toBeTruthy()
    expect(screen.getByText('1. Blocked access near Zone A.')).toBeTruthy()
    expect(screen.getByText('Clear stored items.')).toBeTruthy()
    expect(screen.getAllByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle)).toHaveLength(1)
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel)).toBeTruthy()
    expect(screen.getByText('Whole area was accessible except the west stairwell.')).toBeTruthy()
    expect(screen.getByText('General evidence photo')).toBeTruthy()
    expectItemizedReadOnlyFindings()
  })

  it('renders HSE read-only detail fields and selected outcomes', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-hse-detail-1',
          displayId: 'INSP-HSE-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-29T10:00:00.000Z',
          submittedBy: 'Inspector HSE',
          location: 'Zone A',
          selectedLocation: 'Zone A',
          mainLocation: 'Zone A',
          incidentType: 'Health Safety Environment',
          hsePayloadVersion: 2,
          hseInspectedBy: 'Inspector HSE',
          inspectedAt: '2026-06-29T10:00:00.000Z',
          hseSelections: ['unsafeCondition'],
          hseUnsafeConditionDetails: 'Oil spill near the loading bay.',
          hseImmediateAction: 'Area cordoned off.',
          photos: [
            {
              id: 'hse-photo-1',
              fileName: 'hse.jpg',
              description: 'HSE evidence',
              url: 'data:image/png;base64,abc123',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('HSE Observation').length).toBeGreaterThan(0)
    expect(screen.getByText('Unsafe Condition')).toBeTruthy()
    expect(screen.getByText('Oil spill near the loading bay.')).toBeTruthy()
    expect(screen.getByText('Area cordoned off.')).toBeTruthy()
    const findings = screen.getByText('Inspection Findings').closest('section')
    expect(findings?.querySelectorAll('.inspection-detail-finding-accordion-item')).toHaveLength(2)
  })

  it('renders ER Aux read-only equipment cards in detail mode', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-eraux-detail-1',
          displayId: 'INSP-ERAUX-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-28T10:00:00.000Z',
          submittedBy: 'Inspector Aux',
          location: 'Store',
          selectedLocation: 'Store',
          mainLocation: 'Store',
          incidentType: 'ER Aux Equipment Inspection',
          erAuxInspectedBy: 'Inspector Aux',
          erAuxInspectionDate: '2026-06-28',
          erAuxChecks: [
            {
              id: 'store:fire-jacket',
              location: 'Store',
              equipment: 'Fire Jacket',
              quantity: '15',
              condition: 'OK',
              remarks: '',
            },
            {
              id: 'store:chainsaw',
              location: 'Store',
              equipment: 'Chainsaw',
              quantity: '0',
              condition: 'Missing',
              remarks: 'Sent for replacement.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('Inspection Date/Time')).toBeTruthy()
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByText('Fire Jacket')).toBeTruthy()
    expect(screen.getByText('Chainsaw')).toBeTruthy()
    expect(screen.queryByText('Animal catcher net')).toBeNull()
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    expect(screen.getByText('Sent for replacement.')).toBeTruthy()
    expectItemizedReadOnlyFindings()
  })

  it('resolves persisted ER Aux title aliases through structured detail fallback', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-eraux-alias-1',
          displayId: 'INSP-ERAUX-ALIAS-001',
          status: 'Submitted',
          submittedAt: '2026-07-13T00:56:00.000Z',
          submittedBy: 'Inspector Aux',
          mainLocation: 'Office',
          incidentType: 'Emergency Response Auxiliary Equipment',
          erAuxChecks: [
            {
              id: 'office:smoke-radio',
              mainLocation: 'Office',
              equipment: 'Smoke Radio',
              quantity: '1',
              condition: 'Defect',
              defectRemarks: 'Antenna damaged.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        canEditRecord={() => false}
      />,
    )

    expect(screen.getByText('Smoke Radio')).toBeTruthy()
    expect(screen.getByText('Antenna damaged.')).toBeTruthy()
    expectItemizedReadOnlyFindings()
  })

  it('renders Hydraulic read-only equipment cards in detail mode', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-hydraulic-detail-1',
          displayId: 'INSP-HYD-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-28T10:00:00.000Z',
          submittedBy: 'Inspector Hydraulic',
          location: 'FRT',
          selectedLocation: 'FRT',
          mainLocation: 'FRT',
          incidentType: 'Hydraulic Rescue Tools Inspection',
          hydraulicChecks: [
            {
              id: 'frt:pump-motor-1',
              location: 'FRT',
              equipment: 'Hydraulic Pump Motor 1',
              physicalCondition: 'OK',
              mechanicalCondition: 'OK',
              noLeakage: 'Defect',
              noLeakageRemarks: 'Minor hose leak found.',
              noLeakagePhotos: [
                {
                  id: 'hydraulic-photo-1',
                  fileName: 'hose-leak.jpg',
                  description: 'Leak evidence',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              functionTest: 'OK',
              remarks: 'Requires seal replacement.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0)
    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
    expect(screen.getAllByText('No Leakage').length).toBeGreaterThan(0)
    expect(screen.getByText('Minor hose leak found.')).toBeTruthy()
    expect(screen.getByText('Leak evidence')).toBeTruthy()
    expect(screen.getByText('Requires seal replacement.')).toBeTruthy()
    expectItemizedReadOnlyFindings()
  })

  it('renders Fire Extinguisher read-only rows in detail mode', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-fe-detail-1',
          displayId: 'INSP-FE-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-29T10:00:00.000Z',
          submittedBy: 'Inspector Fire',
          location: 'Manjung Hub > Reception',
          selectedLocation: 'Manjung Hub > Reception',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          incidentType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              feType: 'DP 6KG',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
              physicalConditionPhotos: [
                {
                  id: 'fe-photo-1',
                  fileName: 'dent.jpg',
                  description: 'Cylinder defect',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
              remarks: 'Needs replacement.',
              sessionResult: {
                status: 'completed',
                checkedBy: 'Inspector Fire',
                checkedAt: '2026-06-29T03:31:00.000Z',
              },
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('Extinguishers')).toBeTruthy()
    expect(screen.getByText('ADO-001')).toBeTruthy()
    const extinguisherHeader = screen
      .getByRole('button', { name: /ADO-001/ })
      .querySelector('.inspection-detail-finding-accordion-title-row')
    expect(extinguisherHeader?.textContent || '').toContain('ADO-001')
    expect(extinguisherHeader?.textContent || '').toContain('Checked by Inspector Fire')
    expect(
      within(screen.getByRole('button', { name: /ADO-001/ })).queryByText('Checked'),
    ).toBeNull()
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('DP 6KG') || false).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Cylinder body dented.')).toBeTruthy()
    expect(screen.getByText('Cylinder defect')).toBeTruthy()
    expect(screen.getByText('Needs replacement.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'View photos' }))

    expect(screen.getByText('ADO-001 - FE Physical Condition defect photos')).toBeTruthy()
    expect(screen.getByText('dent.jpg')).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeTruthy()
    expectItemizedReadOnlyFindings()
  })

  it('keeps historical fire extinguisher rows readable when the live catalog row is gone', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-fe-detail-historical-1',
          displayId: 'INSP-FE-DETAIL-ARCHIVED-001',
          status: 'Submitted',
          submittedAt: '2026-06-29T10:00:00.000Z',
          submittedBy: 'Inspector Fire',
          location: 'Manjung Hub > Reception',
          selectedLocation: 'Manjung Hub > Reception',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          incidentType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:archived-1',
              sourceRowNumber: '999',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-999',
              barcodeNo: 'EE042021Y999999',
              feType: 'CO2 5KG',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Archived unit was dented.',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
              remarks: 'Captured before archive.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('ADO-999')).toBeTruthy()
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('CO2 5KG') || false).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Archived unit was dented.')).toBeTruthy()
    expect(screen.getByText('Captured before archive.')).toBeTruthy()
  })

  it('renders SCBA structured cards in read-only detail mode', () => {
    const { container } = render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-scba-detail-1',
          displayId: 'INSP-SCBA-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-28T10:00:00.000Z',
          submittedBy: 'Inspector SCBA',
          location: 'FRT',
          selectedLocation: 'FRT',
          mainLocation: 'FRT',
          incidentType: 'SCBA Inspection',
          description: 'SCBA checked at FRT by Inspector SCBA on 2026-06-28.',
          scbaInspectedBy: 'Inspector SCBA',
          scbaInspectionDate: '2026-06-28',
          scbaBackPlateChecks: [
            {
              id: 'backPlate:frt:msa:06',
              location: 'FRT',
              brand: 'MSA',
              serialNo: '06',
              backPlateHarnessCondition: 'Good',
              highPressureHose: 'Not Good',
              pressureGauge: 'Good',
              alarmDevice: 'Good',
              demandValve: 'Good',
              sealing: 'Good',
              cleanliness: 'Good',
              remarks: 'Hose coupling worn.',
            },
          ],
          scbaCylinderChecks: [
            {
              id: 'cylinder:frt:msa:6-8l-08',
              location: 'FRT',
              brand: 'MSA',
              serialNo: '6.8L/08',
              size: '6.8',
              cylinderType: 'Composite',
              servicePressure: '300',
              containedPressure: '280',
              physicalCondition: 'Good',
              handwheelCondition: 'Good',
              valveBodyCondition: 'Good',
              screwPlugCondition: 'Good',
              cleanliness: 'Good',
              remarks: '',
            },
          ],
          scbaFaceMaskChecks: [
            {
              id: 'faceMask:frt:drager:02',
              location: 'FRT',
              brand: 'Drager',
              serialNo: '02',
              visorCondition: 'Good',
              ldvPort: 'Good',
              ldvReleaseButton: 'Good',
              leakTest: 'Not Good',
              speechDiaphragm: 'Good',
              harness: 'Good',
              neckStrap: 'Good',
              remarks: 'Leak test failed on seal.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('SCBA Items').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Back Plate').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cylinder').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Face Mask').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MSA 06').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Drager 02').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sealing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cleanliness').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Harness').length).toBeGreaterThan(0)

    const detailText = container.textContent || ''
    expect(detailText.indexOf('Back Plate')).toBeLessThan(detailText.indexOf('Cylinder'))
    expect(detailText.indexOf('Cylinder')).toBeLessThan(detailText.indexOf('Face Mask'))
    expect(container.querySelectorAll('.inspection-detail-finding-accordion-item')).toHaveLength(3)
    expectItemizedReadOnlyFindings()
  })

  it('renders High Angle structured cards in read-only detail mode', () => {
    const { container } = render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-high-angle-detail-1',
          displayId: 'INSP-HA-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-28T10:00:00.000Z',
          submittedBy: 'Inspector Rope',
          location: 'Response Kit #1',
          selectedLocation: 'Response Kit #1',
          mainLocation: 'Response Kit #1',
          incidentType: 'High Angle Rescue Equipment Inspection',
          description:
            'High Angle rescue equipment checked for Response Kit #1 by Inspector Rope on 2026-06-28.',
          highAngleInspectedBy: 'Inspector Rope',
          highAngleInspectionDate: '2026-06-28',
          highAngleChecks: [
            {
              id: 'response-kit-1:1',
              rowNumber: '1',
              mainLocation: 'Response Kit #1',
              location: 'N/A',
              subLocation: 'N/A',
              equipment: 'Heavy Duty Organizer Bag',
              quantity: '1',
              condition: 'Good',
              remarks: '',
            },
            {
              id: 'response-kit-1:3',
              rowNumber: '3',
              mainLocation: 'Response Kit #1',
              location: 'Heavy Duty Organizer Bag',
              subLocation: 'Main Compartment',
              equipment: 'Locking Carabiner - CT - Steel - S',
              quantity: '10',
              condition: 'Not Good',
              remarks: 'Gate spring is sticking.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Response Kit #1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('General Kit Items').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Main Compartment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Locking Carabiner - CT - Steel - S').length).toBeGreaterThan(0)
    expect(container.textContent || '').toContain('Gate spring is sticking.')
    expectItemizedReadOnlyFindings()
  })

  it('renders Fire Truck Daily Readiness structured cards in read-only detail mode', () => {
    const { container } = render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-frt-detail-1',
          displayId: 'INSP-FRT-DETAIL-001',
          status: 'Submitted',
          submittedAt: '2026-06-29T10:00:00.000Z',
          submittedBy: 'Inspector Truck',
          location: 'FIRE TRUCK',
          selectedLocation: 'FIRE TRUCK',
          mainLocation: 'FIRE TRUCK',
          incidentType: 'FRT Daily Inspection',
          description: 'FRT Daily inspection checked for FIRE TRUCK on 2026-06-29.',
          frtInspectedBy: 'Inspector Truck',
          frtInspectionDate: '2026-06-29',
          frtShift: 'Day',
          frtTruckReference: {
            plateNo: 'AJG9555',
            roadTaxExpiry: '13/02/2026',
            insuranceExpiry: '13/02/2026',
            puspakomExpiry: '19/02/2026',
          },
          frtDailyRemarks: 'Truck ready for dispatch.',
          frtOneOffRemarks: 'One-off issues tracked.',
          frtDailyChecks: [
            {
              id: 'daily:fire-truck:1',
              rowNumber: '1',
              mainLocation: 'FIRE TRUCK',
              location: 'LOCKER 01',
              equipment: 'FIRE HOSE 2.5"',
              quantity: '6',
              rowKind: 'status',
              status: 'Checked',
              remarks: '',
            },
            {
              id: 'daily:fire-truck:90',
              rowNumber: '90',
              mainLocation: 'FIRE TRUCK',
              location: 'FIRE TRUCK',
              equipment: 'OVERALL BODY',
              quantity: 'N/A',
              rowKind: 'status',
              status: 'Issue',
              remarks: 'Panel dent needs repair.',
            },
            {
              id: 'daily:fire-truck:91',
              rowNumber: '91',
              mainLocation: 'FIRE TRUCK',
              location: 'FIRE TRUCK',
              equipment: 'MILEAGE (ODOMETER)',
              quantity: '',
              rowKind: 'reading',
              readingValue: '123456',
              remarks: '',
            },
          ],
          frtOneOffChecks: [
            {
              id: 'one-off:fire-truck:16',
              rowNumber: '16',
              mainLocation: 'FIRE TRUCK',
              location: 'TRUCK CHECKLIST',
              equipment: 'ELECTRONIC SIREN',
              condition: 'Not Good',
              remarks: 'Mute switch sticking.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Truck Readiness').length).toBeGreaterThan(0)
    expect(screen.getAllByText('One-Off Readiness Checklist').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Plate No.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('LOCKER 01').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TRUCK CHECKLIST').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MILEAGE (ODOMETER)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('123456').length).toBeGreaterThan(0)
    expect(container.textContent || '').toContain('Mute switch sticking.')

    const detailText = container.textContent || ''
    expect(detailText.indexOf('Truck Readiness')).toBeLessThan(
      detailText.indexOf('One-Off Readiness Checklist'),
    )
    expect(container.querySelectorAll('.inspection-detail-finding-accordion-item')).toHaveLength(4)
    expectItemizedReadOnlyFindings()
  })

  it('renders only Crew Cabin rows for a crew-cabin-only Fire Truck report', () => {
    const { container } = render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-frt-detail-crew-cabin',
          displayId: 'INSP-FRT-CREW-CABIN',
          status: 'Submitted',
          submittedAt: '2026-07-27T10:00:00.000Z',
          submittedBy: 'Inspector Truck',
          location: 'FIRE TRUCK',
          selectedLocation: 'FIRE TRUCK',
          mainLocation: 'FIRE TRUCK',
          incidentType: 'FRT Daily Inspection',
          frtInspectedBy: 'Inspector Truck',
          frtInspectionDate: '2026-07-27',
          frtTruckPlateNo: 'AJG9555',
          frtTruckReference: { plateNo: 'AJG9555' },
          frtDailyChecks: [],
          frtOneOffChecks: [
            {
              id: 'one-off:fire-truck:45',
              rowNumber: '45',
              mainLocation: 'FIRE TRUCK',
              location: 'CREW CABIN',
              equipment: 'BA SET : 4',
              condition: 'Good',
            },
            {
              id: 'one-off:fire-truck:46',
              rowNumber: '46',
              mainLocation: 'FIRE TRUCK',
              location: 'CREW CABIN',
              equipment: 'RADIO SET : 1',
              condition: 'Not Good',
              remarks: 'Radio requires service.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByText('CREW CABIN').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BA SET : 4').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RADIO SET : 1').length).toBeGreaterThan(0)
    expect(screen.queryByText('LOCKER 01')).toBeNull()
    expect(screen.queryByText('FIRE HOSE 2.5"')).toBeNull()
    expect(container.querySelectorAll('.inspection-detail-finding-accordion-item')).toHaveLength(2)
  })

  it('renders workflow history inside report metadata without a detached workflow section', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-workflow-detail-1',
          displayId: 'INS-WORKFLOW-001',
          status: 'Reviewed',
          submittedAt: '2026-07-08T03:44:00.000Z',
          submittedBy: 'Jang',
          submittedByRole: 'System Administrator',
          submittedByRoleCode: 'SA',
          location: 'Zone 2 > Potable Water Pump House',
          selectedLocation: 'Zone 2 > Potable Water Pump House',
          mainLocation: 'Potable Water Pump House',
          incidentType: 'General Inspection',
          inspectionIssues: [
            {
              id: 'finding-1',
              description: 'Blocked access near the pump house.',
              actionRequired: 'Clear access lane.',
              photos: [],
            },
          ],
          timeline: [
            {
              action: 'Submitted',
              by: 'Jang',
              actorRole: 'System Administrator',
              actorRoleCode: 'SA',
            },
            {
              action: 'Reviewed',
              by: 'Reviewer One',
              actorRole: 'Incident Commander',
              actorRoleCode: 'IC',
              remarks: 'Looks complete.',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('Report Metadata')).toBeTruthy()
    expect(screen.getByText('Reviewed By')).toBeTruthy()
    expect(screen.getByText('Reviewer One')).toBeTruthy()
    expect(screen.getByText('Incident Commander (IC)')).toBeTruthy()
    expect(screen.getByText('Remarks: Looks complete.')).toBeTruthy()
    expect(screen.queryByText('Workflow Activity')).toBeNull()
  })

  it('shows display context labels for fire extinguisher details instead of setup labels', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-fe-context-1',
          displayId: 'INSP-FE-CONTEXT-001',
          status: 'Submitted',
          submittedAt: '2026-07-08T03:44:00.000Z',
          submittedBy: 'Inspector Fire',
          zone: '2',
          location: 'Manjung Hub > Reception',
          selectedLocation: 'Manjung Hub > Reception',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          incidentType: 'Fire Extinguisher Inspection',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '2',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              feType: 'DP 6KG',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('Inspection Context')).toBeTruthy()
    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.getByText('Zone')).toBeTruthy()
    expect(screen.getByText('Main Area')).toBeTruthy()
    expect(screen.getByText('Location')).toBeTruthy()
    expect(screen.queryByText('Choose Main Location')).toBeNull()
    expect(screen.queryByText('Choose Sub-location')).toBeNull()
  })

  it('renders the primary review action and supporting mobile action sheet', () => {
    const onBack = vi.fn()
    const onReviewRecord = vi.fn()
    const onDownloadRecord = vi.fn()

    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-mobile-actions-1',
          displayId: 'INS-MOBILE-001',
          status: 'Submitted',
          submittedAt: '2026-07-08T03:44:00.000Z',
          submittedBy: 'Jang',
          location: 'Zone A',
          selectedLocation: 'Zone A',
          mainLocation: 'Zone A',
          incidentType: 'General Inspection',
          canReview: true,
          canDownloadPdf: true,
          inspectionIssues: [
            {
              id: 'finding-1',
              description: 'Blocked access lane.',
              actionRequired: 'Clear it.',
              photos: [],
            },
          ],
        }}
        onBack={onBack}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={onReviewRecord}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={onDownloadRecord}
      />,
    )

    const actionGroup = screen.getByRole('group', { name: 'Inspection detail actions' })
    expect(actionGroup.className).toContain('inspection-detail-inline-actions')
    expect(actionGroup.className).not.toContain('action-row-thumb')
    expect(within(actionGroup).getByRole('button', { name: 'Review' })).toBeTruthy()
    expect(within(actionGroup).getByRole('button', { name: 'More actions' })).toBeTruthy()

    fireEvent.click(within(actionGroup).getByRole('button', { name: 'More actions' }))

    const moreDrawer = screen.getByRole('dialog')
    expect(moreDrawer.querySelector('.inspection-detail-more-actions')).toBeTruthy()
    expect(within(moreDrawer).getByRole('button', { name: 'Download report' })).toBeTruthy()
    expect(within(moreDrawer).getByRole('button', { name: 'Back to records' })).toBeTruthy()
  })

  it('keeps approve primary and moves reject into the decision action sheet', () => {
    render(
      <InspectionDetailSection
        selectedRecord={{
          id: 'inspection-mobile-decision-1',
          displayId: 'INS-MOBILE-DECISION-001',
          status: 'Reviewed',
          submittedAt: '2026-07-08T03:44:00.000Z',
          submittedBy: 'Jang',
          location: 'Zone A',
          selectedLocation: 'Zone A',
          mainLocation: 'Zone A',
          incidentType: 'General Inspection',
          canApprove: true,
          canReject: true,
          inspectionIssues: [
            {
              id: 'finding-1',
              description: 'Blocked access lane.',
              actionRequired: 'Clear it.',
              photos: [],
            },
          ],
        }}
        onBack={vi.fn()}
        formatDateTime={() => ''}
        renderStatusBadge={(status) => <span>{status}</span>}
        onEditRecord={vi.fn()}
        canEditRecord={() => false}
        onReviewRecord={vi.fn()}
        onApproveRecord={vi.fn()}
        onRejectRecord={vi.fn()}
        onDownloadRecord={vi.fn()}
      />,
    )

    const actionGroup = screen.getByRole('group', { name: 'Inspection detail actions' })
    expect(within(actionGroup).getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(within(actionGroup).queryByRole('button', { name: 'Reject' })).toBeNull()

    fireEvent.click(within(actionGroup).getByRole('button', { name: 'More actions' }))

    const moreDrawer = screen.getByRole('dialog')
    expect(within(moreDrawer).getByRole('button', { name: 'Reject' })).toBeTruthy()
    expect(within(moreDrawer).getByRole('button', { name: 'Back to records' })).toBeTruthy()
  })
})
