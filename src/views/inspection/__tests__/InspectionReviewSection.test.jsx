// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import InspectionReviewSection from '../InspectionReviewSection'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'

afterEach(() => {
  cleanup()
})

describe('InspectionReviewSection', () => {
  it('hides repeated workflow labels and audit-only fields during active submission review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-fe-submit-1',
          displayId: 'INS-01-772026',
          status: 'Draft',
          location: 'Zone 2 > Potable Water Pump House',
          incidentType: 'Fire Extinguisher Inspection',
          submittedByRole: 'System Administrator',
          submittedByRoleCode: 'SA',
        }}
        reviewSummary={{ metrics: { count: 1, defectCount: 0 } }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Submit Inspection',
          hideSaveDraft: true,
        }}
      />,
    )

    expect(screen.queryByText('Review Inspection')).toBeNull()
    expect(screen.getAllByText('Ready to submit')).toHaveLength(1)
    expect(screen.getAllByText('Fire Extinguisher')).toHaveLength(1)
    expect(screen.getByText('1 saved item')).toBeTruthy()
    expect(screen.getByText('INS-01-772026')).toBeTruthy()
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText('Type')).toBeNull()
    expect(screen.queryByText('Role')).toBeNull()
    expect(screen.queryByText('System Administrator (SA)')).toBeNull()
    expect(screen.getByText('Inspection Date/Time')).toBeTruthy()
    expect(screen.getByText('Location')).toBeTruthy()
  })

  it('keeps audit metadata visible outside the active submission review flow', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-fe-submitted-1',
          displayId: 'INS-SUB-001',
          status: 'Submitted',
          location: 'Zone 2 > Potable Water Pump House',
          incidentType: 'Fire Extinguisher Inspection',
          submittedBy: 'Jang',
          submittedByRole: 'System Administrator',
          submittedByRoleCode: 'SA',
          submittedAt: '2026-07-07T12:01:00',
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText('Status')).toBeTruthy()
    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.getByText('Role')).toBeTruthy()
    expect(screen.getByText('System Administrator (SA)')).toBeTruthy()
    expect(screen.getByText('Submitted By')).toBeTruthy()
    expect(screen.getByText('Jang')).toBeTruthy()
  })

  it('renders an inline mobile review action group with an explicit back-to-edit path', () => {
    const { container } = render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-eraux-1',
          displayId: 'INSP-001',
          status: 'In Review',
          location: 'Store',
          incidentType: 'ER Aux Equipment Inspection',
          description: 'ER Aux review summary',
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    const actionGroup = screen.getByRole('group', { name: 'Inspection review actions' })
    expect(actionGroup.className).toContain('inspection-review-inline-actions')
    expect(actionGroup.className).not.toContain('action-row-thumb')
    expect(within(actionGroup).getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(within(actionGroup).getByRole('button', { name: 'Save Draft' })).toBeTruthy()
    expect(within(actionGroup).getByRole('button', { name: 'Confirm Submit' })).toBeTruthy()
  })

  it('renders queued-submit warning copy and queue-risk confirm label', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-offline-1',
          displayId: 'INSP-OFFLINE-001',
          status: 'In Review',
          location: 'Zone A',
          incidentType: 'General Inspection',
          description: 'Offline review summary',
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Queue for sync',
        }}
        queueWarning="You appear to be offline or local sync is pending. This report will be queued on this device until sync succeeds."
      />,
    )

    expect(
      screen.getAllByText(/This report will be queued on this device until sync succeeds/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Queue for sync' }).length).toBeGreaterThan(0)
  })

  it('renders General Inspection findings and optional evidence during review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-general-review-1',
          displayId: 'INSP-GEN-001',
          status: 'In Review',
          location: 'Zone A',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByText('Housekeeping checked')).toBeNull()
    expect(screen.queryByText('Access clear')).toBeNull()
    expect(screen.queryByText('Describe')).toBeNull()
    expect(screen.queryByText('General inspection summary for Zone A.')).toBeNull()
    expect(screen.getAllByText('Findings').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1. Blocked access near Zone A.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clear stored items.').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel)).toBeTruthy()
    expect(screen.getByText('Whole area was accessible except the west stairwell.')).toBeTruthy()
    expect(screen.getAllByText('General evidence photo').length).toBeGreaterThan(0)
  })

  it('renders HSE observation outcomes and detail fields during review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-hse-review-1',
          displayId: 'INSP-HSE-001',
          status: 'In Review',
          location: 'Zone A',
          mainLocation: 'Zone A',
          incidentType: 'Health Safety Environment Inspection',
          hseInspectedBy: 'Inspector HSE',
          hseInspectionDate: '2026-06-29',
          hseSelections: ['unsafeAct', 'environmental'],
          hseSeverity: 'High',
          hseUnsafeActDetails: 'Observed unsafe lifting posture.',
          hseEnvironmentalDetails: 'Oil spill near the loading bay.',
          hseImmediateAction: 'Area cordoned off.',
          hseCorrectiveAction: 'Spill kit deployed.',
          hseResponsiblePerson: 'Shift supervisor',
          hseTargetDate: '2026-06-30',
          hseRemarks: 'Follow-up inspection required.',
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('HSE Observation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unsafe Act').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Environmental').length).toBeGreaterThan(0)
    expect(screen.getAllByText('High').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Observed unsafe lifting posture.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Oil spill near the loading bay.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Area cordoned off.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Spill kit deployed.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shift supervisor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2026-06-30').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Follow-up inspection required.').length).toBeGreaterThan(0)
  })

  it('renders ER Aux read-only equipment cards during review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-eraux-review-1',
          displayId: 'INSP-ERAUX-001',
          status: 'In Review',
          location: 'Store',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('Inspection Date/Time').length).toBeGreaterThan(0)
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fire Jacket').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chainsaw').length).toBeGreaterThan(0)
    expect(screen.queryByText('Animal catcher net')).toBeNull()
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sent for replacement.').length).toBeGreaterThan(0)
  })

  it('renders Hydraulic read-only equipment cards during review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-hydraulic-review-1',
          displayId: 'INSP-HYD-001',
          status: 'In Review',
          location: 'FRT',
          mainLocation: 'FRT',
          incidentType: 'Hydraulic Rescue Tools Inspection',
          hydraulicChecks: [
            {
              id: 'frt:pump-motor-1',
              location: 'FRT',
              equipment: 'Hydraulic Pump Motor 1',
              physicalCondition: 'OK',
              physicalConditionRemarks: 'Previous handle crack evidence retained.',
              physicalConditionPhotos: [
                {
                  id: 'hydraulic-retained-photo-1',
                  fileName: 'old-crack.jpg',
                  description: 'Previous handle crack caption',
                  url: 'data:image/png;base64,abc123',
                },
              ],
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
              functionTest: 'N/A',
              functionTestRemarks: 'Function test skipped during isolation.',
              remarks: 'Requires seal replacement.',
            },
          ],
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hydraulic Pump Motor 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Physical Condition').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mechanical Condition').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No Leakage').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Function Test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Minor hose leak found.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Function test skipped during isolation.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Leak evidence').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Physical Condition retained evidence from earlier status').length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Previous handle crack evidence retained.').length).toBeGreaterThan(
      0,
    )
    expect(screen.getAllByText('Previous handle crack caption').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Requires seal replacement.').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'All OK' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark OK' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add defect photo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remark' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Photo' })).toBeNull()
  })

  it('renders Fire Extinguisher read-only rows during review', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-fe-review-1',
          displayId: 'INSP-FE-001',
          status: 'In Review',
          location: 'Manjung Hub > Reception',
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
            },
          ],
        }}
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('Extinguishers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ADO-001').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('DP 6KG') || false).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Cylinder body dented.').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'View photos' })[0])
    expect(screen.getAllByText('Cylinder defect').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Needs replacement.').length).toBeGreaterThan(0)
  })

  it('keeps historical fire extinguisher review rows readable without live catalog data', () => {
    render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-fe-review-historical-1',
          displayId: 'INSP-FE-ARCHIVED-001',
          status: 'In Review',
          location: 'Manjung Hub > Reception',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('ADO-999').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('CO2 5KG') || false).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Archived unit was dented.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Captured before archive.').length).toBeGreaterThan(0)
  })

  it('renders SCBA read-only sections during review', () => {
    const { container } = render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-scba-1',
          displayId: 'INSP-SCBA-001',
          status: 'In Review',
          location: 'FRT',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
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

    const reviewText = container.textContent || ''
    expect(reviewText.indexOf('Back Plate')).toBeLessThan(reviewText.indexOf('Cylinder'))
    expect(reviewText.indexOf('Cylinder')).toBeLessThan(reviewText.indexOf('Face Mask'))
  })

  it('renders High Angle read-only sections during review', () => {
    const { container } = render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-high-angle-1',
          displayId: 'INSP-HA-001',
          status: 'In Review',
          location: 'Response Kit #1',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
      />,
    )

    expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Response Kit #1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('General Kit Items').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Main Compartment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Locking Carabiner - CT - Steel - S').length).toBeGreaterThan(0)
    expect(container.textContent || '').toContain('Qty 10')
    expect(container.textContent || '').toContain('Gate spring is sticking.')
  })

  it('renders Fire Truck Daily Readiness read-only sections during review', () => {
    const { container } = render(
      <InspectionReviewSection
        selectedRecord={{
          id: 'inspection-frt-1',
          displayId: 'INSP-FRT-001',
          status: 'In Review',
          location: 'FIRE TRUCK',
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
        reviewActions={{
          onBackToEdit: vi.fn(),
          onSaveDraft: vi.fn(),
          onConfirm: vi.fn(),
          confirmLabel: 'Confirm Submit',
        }}
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

    const reviewText = container.textContent || ''
    expect(reviewText.indexOf('Truck Readiness')).toBeLessThan(
      reviewText.indexOf('One-Off Readiness Checklist'),
    )
  })
})
