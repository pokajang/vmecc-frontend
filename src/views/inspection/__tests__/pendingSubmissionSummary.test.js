import { describe, expect, it } from 'vitest'
import { buildInspectionDraftPayload, normalizeInspectionForm } from '../inspectionFormHelpers'
import { buildPendingSubmissionSummary } from '../form/pendingSubmissionSummary'

const completeFireExtinguisherRow = {
  id: 'fe-1',
  idLocNo: 'CAN-001',
  zone: '1',
  mainLocation: 'Canteen',
  subLocation: 'Canteen',
  physicalCondition: 'Good',
  signageCondition: 'Good',
  boxKeyAvailability: 'Yes',
  boxGlassAvailability: 'Yes',
  operationalCondition: 'Good',
}

describe('pending submission summary', () => {
  it('preserves per-type snapshots through normalization and draft payloads', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'General Inspection',
      inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
      inspectionTypeDrafts: {
        'fire extinguisher inspection': {
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherChecks: [completeFireExtinguisherRow],
        },
      },
    })
    const payload = buildInspectionDraftPayload({
      form,
      user: { id: 'user-1', name: 'Inspector' },
    })

    expect(
      form.inspectionTypeDrafts['fire extinguisher inspection'].fireExtinguisherChecks,
    ).toHaveLength(1)
    expect(
      payload.inspectionTypeDrafts['fire extinguisher inspection'].fireExtinguisherChecks,
    ).toHaveLength(1)
  })

  it('collects unsubmitted saved work by inspection type', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        zone: '2',
        mainLocation: 'Workshop',
        subLocation: 'Pump Room',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        inspectionTypeDrafts: {
          'fire extinguisher inspection': {
            inspectionType: 'Fire Extinguisher Inspection',
            fireExtinguisherChecks: [completeFireExtinguisherRow],
          },
          'health safety environment inspection': {
            inspectionType: 'Health Safety Environment Inspection',
            zone: '1',
            mainLocation: 'Canteen',
            subLocation: 'Kitchen',
            hseSelections: ['areaSatisfactory'],
            hseAreaConditionRemarks: 'Area clean.',
          },
        },
      },
      draftSyncState: { status: 'synced' },
    })

    expect(summary.items.map((item) => item.inspectionType)).toEqual([
      'Fire Extinguisher Inspection',
      'Health Safety Environment Inspection',
      'General Inspection',
    ])
    expect(
      summary.items.find((item) => item.inspectionType === 'Fire Extinguisher Inspection'),
    ).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({ count: 1, checkedCount: 1 }),
      }),
    )
    expect(summary.items.find((item) => item.inspectionType === 'General Inspection')).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({ count: 1 }),
      }),
    )
  })

  it('strips nested draft maps from per-type pending submission forms', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        inspectionTypeDrafts: {
          'fire extinguisher inspection': {
            inspectionType: 'Fire Extinguisher Inspection',
            fireExtinguisherChecks: [completeFireExtinguisherRow],
            inspectionTypeDrafts: {
              'general inspection': {
                inspectionType: 'General Inspection',
                inspectionIssues: [{ id: 'nested-issue', description: 'Nested stale draft.' }],
              },
            },
          },
        },
      },
      draftSyncState: { status: 'synced' },
    })

    const fireExtinguisher = summary.items.find(
      (item) => item.inspectionType === 'Fire Extinguisher Inspection',
    )
    expect(fireExtinguisher?.form).toEqual(
      expect.not.objectContaining({
        inspectionTypeDrafts: expect.any(Object),
      }),
    )
  })

  it('drops a submitted type from the pending summary when its draft has been cleared', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: '',
        inspectionTypeDrafts: {
          'general inspection': {
            inspectionType: 'General Inspection',
            zone: '2',
            mainLocation: 'Workshop',
            subLocation: 'Pump Room',
            inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
          },
        },
      },
      draftSyncState: {
        status: 'syncing',
        pendingType: '',
        scope: 'all',
      },
    })

    expect(summary.items.map((item) => item.inspectionType)).toEqual(['General Inspection'])
    expect(summary.items[0]).toEqual(
      expect.objectContaining({
        status: 'syncing',
        metrics: expect.objectContaining({ count: 1 }),
      }),
    )
  })

  it('keeps failed draft sync retryable without blocking final submit', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        inspectionTypeDrafts: {
          'fire extinguisher inspection': {
            inspectionType: 'Fire Extinguisher Inspection',
            fireExtinguisherChecks: [completeFireExtinguisherRow],
          },
        },
      },
      draftSyncState: {
        status: 'failed',
        pendingType: 'General Inspection',
        lastError: 'Backend draft sync failed.',
      },
    })

    expect(
      summary.items.find((item) => item.inspectionType === 'Fire Extinguisher Inspection')?.status,
    ).toBe('ready')
    const general = summary.items.find((item) => item.inspectionType === 'General Inspection')
    expect(general?.status).toBe('ready')
    expect(general?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'draft-sync-failed',
          message: 'Backend draft sync failed.',
          nonBlocking: true,
        }),
      ]),
    )
  })

  it('blocks submission when the exact server draft has a version conflict', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
      },
      draftSyncState: {
        status: 'conflict',
        pendingType: 'General Inspection',
        lastError: 'This draft changed since it was loaded.',
      },
    })

    expect(summary.items[0].status).toBe('blocked')
    expect(summary.items[0].blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'draft-version-conflict',
          message: 'This draft changed since it was loaded.',
        }),
      ]),
    )
  })

  it('blocks FE submission for a teammate who is not the starter or supervisor', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        inspectionSessionCanSubmit: false,
        fireExtinguisherChecks: [completeFireExtinguisherRow],
      },
    })

    expect(summary.items[0].readiness.isReadyToSubmit).toBe(false)
    expect(summary.items[0].blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'inspection-session-submit-forbidden' }),
      ]),
    )
  })

  it('blocks only the type with pending backend draft sync', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        inspectionTypeDrafts: {
          'fire extinguisher inspection': {
            inspectionType: 'Fire Extinguisher Inspection',
            fireExtinguisherChecks: [completeFireExtinguisherRow],
          },
        },
      },
      draftSyncState: {
        status: 'syncing',
        pendingType: 'General Inspection',
      },
    })

    expect(
      summary.items.find((item) => item.inspectionType === 'Fire Extinguisher Inspection')?.status,
    ).toBe('ready')
    const general = summary.items.find((item) => item.inspectionType === 'General Inspection')
    expect(general?.status).toBe('syncing')
    expect(general?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'draft-sync-pending',
          message: 'Syncing...',
        }),
      ]),
    )
  })

  it('blocks all pending types when a full draft sync is pending', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        inspectionTypeDrafts: {
          'fire extinguisher inspection': {
            inspectionType: 'Fire Extinguisher Inspection',
            fireExtinguisherChecks: [completeFireExtinguisherRow],
          },
        },
      },
      draftSyncState: {
        status: 'syncing',
        pendingType: 'General Inspection',
        scope: 'all',
      },
    })

    const fireExtinguisher = summary.items.find(
      (item) => item.inspectionType === 'Fire Extinguisher Inspection',
    )
    const general = summary.items.find((item) => item.inspectionType === 'General Inspection')

    expect(fireExtinguisher?.status).toBe('syncing')
    expect(general?.status).toBe('syncing')
    expect(fireExtinguisher?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'draft-sync-pending',
        }),
      ]),
    )
    expect(general?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'draft-sync-pending',
        }),
      ]),
    )
  })

  it('blocks fire extinguisher submission while session sync retries are pending', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        fireExtinguisherChecks: [completeFireExtinguisherRow],
      },
      draftSyncState: { status: 'synced' },
      fireExtinguisherSessionRetryCount: 2,
    })

    const fireExtinguisher = summary.items.find(
      (item) => item.inspectionType === 'Fire Extinguisher Inspection',
    )
    expect(fireExtinguisher?.status).toBe('needs_attention')
    expect(fireExtinguisher?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'fire-extinguisher-session-sync',
          message: '2 fire extinguisher session updates could not sync. Retry to continue.',
        }),
      ]),
    )
  })

  it('counts Fire Extinguisher defect blockers from missing issue remarks only', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        fireExtinguisherChecks: [
          {
            ...completeFireExtinguisherRow,
            id: 'fe-defect-1',
            idLocNo: 'CAN-DEFECT-001',
            physicalCondition: 'Not Good',
            physicalConditionRemarks: '',
            physicalConditionPhotos: [],
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const fireExtinguisher = summary.items.find(
      (item) => item.inspectionType === 'Fire Extinguisher Inspection',
    )
    expect(fireExtinguisher).toEqual(
      expect.objectContaining({
        status: 'needs_attention',
        metrics: expect.objectContaining({
          count: 1,
          checkedCount: 0,
          defectCount: 1,
          incompleteCount: 1,
          evidenceIssueCount: 1,
        }),
        blockers: expect.arrayContaining([
          expect.objectContaining({ key: 'incomplete-items' }),
          expect.objectContaining({ key: 'evidence' }),
        ]),
      }),
    )
  })

  it('summarizes non-FE structured equipment types independently', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Office',
        erAuxChecks: [
          {
            id: 'eraux:radio',
            equipment: 'Tetra Radio',
            mainLocation: 'Office',
            location: 'Office',
            quantity: '8',
            condition: 'OK',
          },
        ],
        inspectionTypeDrafts: {
          'hydraulic rescue tools inspection': {
            inspectionType: 'Hydraulic Rescue Tools Inspection',
            mainLocation: 'FRT',
            hydraulicChecks: [
              {
                id: 'hydraulic:1',
                equipment: 'Hydraulic Pump',
                mainLocation: 'FRT',
                location: 'FRT',
                physicalCondition: 'OK',
                mechanicalCondition: 'OK',
                hoseCondition: 'OK',
                noLeakage: 'OK',
                functionTest: 'OK',
              },
            ],
          },
        },
      },
      draftSyncState: { status: 'synced' },
    })

    expect(
      summary.items.find((item) => item.inspectionType === 'ER Aux Equipment Inspection'),
    ).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({ count: 1, checkedCount: 1 }),
        groups: expect.arrayContaining([
          expect.objectContaining({
            label: 'Tetra Radio',
            mainLocation: 'Office',
            status: 'OK',
          }),
        ]),
      }),
    )
    expect(
      summary.items.find((item) => item.inspectionType === 'Hydraulic Rescue Tools Inspection'),
    ).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({ count: 1, checkedCount: 1 }),
        groups: expect.arrayContaining([
          expect.objectContaining({
            label: 'Hydraulic Pump',
            mainLocation: 'FRT',
            status: 'Recorded',
          }),
        ]),
      }),
    )
  })

  it('summarizes FRT daily and one-off saved checks together', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Fire Truck Daily Readiness',
        mainLocation: 'FRT-01',
        subLocation: 'Cabin',
        frtTruckPlateNo: 'FRT-01',
        frtTruckReference: { plateNo: 'FRT-01' },
        frtDailyChecks: [
          {
            id: 'daily-1',
            equipment: 'Fuel level',
            location: 'Cabin',
            status: 'OK',
          },
        ],
        frtOneOffChecks: [
          {
            id: 'one-off-1',
            equipment: 'Portable pump',
            location: 'Cabin',
            condition: 'Good',
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const frt = summary.items.find((item) => item.inspectionType === 'Fire Truck Daily Readiness')
    expect(frt).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({ count: 2 }),
        groups: expect.arrayContaining([
          expect.objectContaining({ label: 'Fuel level' }),
          expect.objectContaining({ label: 'Portable pump' }),
        ]),
      }),
    )
  })

  it('groups Fire Truck checks by every saved compartment instead of the active compartment', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Fire Truck Daily Readiness',
        mainLocation: 'FRT-01',
        subLocation: 'Locker 02',
        frtTruckPlateNo: 'FRT-01',
        frtDailyChecks: [
          { id: 'daily-1', equipment: 'Hose', compartment: 'Locker 01', status: 'Checked' },
          { id: 'daily-2', equipment: 'Nozzle', location: 'Locker 02', status: 'Checked' },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const frt = summary.items.find((item) => item.inspectionType === 'Fire Truck Daily Readiness')
    expect(frt?.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mainLocation: 'FRT-01', subLocation: 'LOCKER 01' }),
        expect.objectContaining({ mainLocation: 'FRT-01', subLocation: 'LOCKER 02' }),
      ]),
    )
  })

  it('treats N/A as a completed neutral result rather than an issue', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Store',
        erAuxChecks: [
          { id: 'store:spare-radio', equipment: 'Spare radio', quantity: '0', condition: 'N/A' },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const erAux = summary.items.find(
      (item) => item.inspectionType === 'ER Aux Equipment Inspection',
    )
    expect(erAux?.metrics).toEqual(expect.objectContaining({ checkedCount: 1, defectCount: 0 }))
    expect(erAux?.groups[0]).toEqual(expect.objectContaining({ status: 'N/A' }))
  })

  it('summarizes saved SCBA rows across locations and custom sections', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'SCBA Inspection',
        mainLocation: 'FRT',
        scbaBackPlateChecks: [
          {
            id: 'backPlate:frt:msa:01',
            location: 'FRT',
            mainLocation: 'FRT',
            brand: 'MSA',
            serialNo: '01',
            backPlateHarnessCondition: 'Good',
            highPressureHose: 'Good',
            pressureGauge: 'Good',
            alarmDevice: 'Good',
            demandValve: 'Good',
            sealing: 'Good',
            cleanliness: 'Good',
          },
          {
            id: 'backPlate:store:msa:02',
            location: 'Store',
            mainLocation: 'Store',
            brand: 'MSA',
            serialNo: '02',
            backPlateHarnessCondition: 'Good',
            highPressureHose: 'Good',
            pressureGauge: 'Good',
            alarmDevice: 'Good',
            demandValve: 'Good',
            sealing: 'Good',
            cleanliness: 'Good',
          },
        ],
        scbaCustomSections: [
          {
            title: 'Spare Regulator',
            fields: [{ key: 'oxygenFlow', label: 'Oxygen Flow', kind: 'status' }],
            rows: [
              {
                id: 'custom:regulator:01',
                location: 'Store',
                mainLocation: 'Store',
                brand: 'Drager',
                serialNo: 'R-01',
                oxygenFlow: 'Not Good',
                oxygenFlowRemarks: 'Flow sticks during test.',
                oxygenFlowPhotos: [{ url: '/uploads/scba-regulator.jpg' }],
              },
            ],
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const scba = summary.items.find((item) => item.inspectionType === 'SCBA Inspection')
    expect(scba).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({
          count: 3,
          checkedCount: 3,
          defectCount: 1,
          incompleteCount: 0,
          evidenceIssueCount: 0,
        }),
        groups: expect.arrayContaining([
          expect.objectContaining({ mainLocation: 'FRT', label: 'Back Plate MSA 01' }),
          expect.objectContaining({ mainLocation: 'Store', label: 'Back Plate MSA 02' }),
          expect.objectContaining({ mainLocation: 'Store', label: 'Drager R-01', status: 'Issue' }),
        ]),
      }),
    )
  })

  it('allows SCBA issue rows with remarks even when photos are omitted', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'SCBA Inspection',
        mainLocation: 'Store',
        scbaCustomSections: [
          {
            title: 'Spare Mask',
            fields: [{ key: 'maskSeal', label: 'Mask Seal', kind: 'status' }],
            rows: [
              {
                id: 'custom:mask:01',
                location: 'Store',
                mainLocation: 'Store',
                brand: 'MSA',
                serialNo: 'M-01',
                maskSeal: 'Not Good',
                maskSealRemarks: 'Seal failed pressure test.',
              },
            ],
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const scba = summary.items.find((item) => item.inspectionType === 'SCBA Inspection')
    expect(scba?.status).toBe('ready')
    expect(scba?.metrics).toEqual(
      expect.objectContaining({
        count: 1,
        checkedCount: 1,
        defectCount: 1,
        evidenceIssueCount: 0,
      }),
    )
    expect(scba?.blockers).toEqual([])
  })

  it('summarizes saved structured rows across locations instead of only the active location', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Office',
        erAuxChecks: [
          {
            id: 'office:radio',
            equipment: 'Radio',
            mainLocation: 'Office',
            location: 'Office',
            quantity: '2',
            condition: 'OK',
          },
          {
            id: 'warehouse:lamp',
            equipment: 'Lamp',
            mainLocation: 'Warehouse',
            location: 'Warehouse',
            quantity: '1',
            condition: 'OK',
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const erAux = summary.items.find(
      (item) => item.inspectionType === 'ER Aux Equipment Inspection',
    )
    expect(erAux).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({
          count: 2,
          checkedCount: 2,
          incompleteCount: 0,
        }),
        groups: expect.arrayContaining([
          expect.objectContaining({ label: 'Radio', mainLocation: 'Office' }),
          expect.objectContaining({ label: 'Lamp', mainLocation: 'Warehouse' }),
        ]),
      }),
    )
  })

  it('shows HSE finding cards in pending submissions even without a structured HSE outcome', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Health Safety Environment Inspection',
        zone: '1',
        mainLocation: 'Canteen',
        subLocation: 'Kitchen',
        inspectionIssues: [{ id: 'hse-issue-1', description: 'Slip hazard near sink.' }],
      },
      draftSyncState: { status: 'synced' },
    })

    const hse = summary.items.find(
      (item) => item.inspectionType === 'Health Safety Environment Inspection',
    )
    expect(hse).toEqual(
      expect.objectContaining({
        status: 'needs_attention',
        metrics: expect.objectContaining({
          count: 1,
          checkedCount: 1,
          defectCount: 1,
        }),
        groups: [
          expect.objectContaining({
            label: 'Slip hazard near sink.',
            mainLocation: 'Canteen',
            subLocation: 'Kitchen',
            status: 'Issue',
          }),
        ],
      }),
    )
    expect(hse?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'hseSelection',
          message: 'Required inspection details are incomplete.',
        }),
      ]),
    )
  })

  it('uses saved finding location context instead of the current form location', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'General Inspection',
        zone: '9',
        mainLocation: 'Current Area',
        subLocation: 'Current Location',
        inspectionIssues: [
          {
            id: 'issue-1',
            description: 'Blocked access at earlier location.',
            zone: '2',
            mainLocation: 'Workshop',
            subLocation: 'Pump Room',
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const general = summary.items.find((item) => item.inspectionType === 'General Inspection')
    expect(general?.groups).toEqual([
      expect.objectContaining({
        zone: '2',
        mainLocation: 'Workshop',
        subLocation: 'Pump Room',
        label: 'Blocked access at earlier location.',
      }),
    ])
  })

  it('summarizes structured HSE observation and HSE finding cards together', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'Health Safety Environment Inspection',
        zone: '1',
        mainLocation: 'Canteen',
        subLocation: 'Kitchen',
        hseSelections: ['areaSatisfactory'],
        hseAreaConditionRemarks: 'Area clean.',
        inspectionIssues: [{ id: 'hse-issue-1', description: 'Minor trip hazard logged.' }],
      },
      draftSyncState: { status: 'synced' },
    })

    const hse = summary.items.find(
      (item) => item.inspectionType === 'Health Safety Environment Inspection',
    )
    expect(hse).toEqual(
      expect.objectContaining({
        status: 'ready',
        metrics: expect.objectContaining({
          count: 2,
          checkedCount: 2,
          defectCount: 1,
        }),
        groups: expect.arrayContaining([
          expect.objectContaining({ label: 'Area satisfactory', status: 'Recorded' }),
          expect.objectContaining({ label: 'Minor trip hazard logged.', status: 'Issue' }),
        ]),
      }),
    )
  })

  it('blocks structured equipment type submission when saved rows are incomplete', () => {
    const summary = buildPendingSubmissionSummary({
      form: {
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Office',
        erAuxChecks: [
          {
            id: 'eraux:radio',
            equipment: 'Tetra Radio',
            mainLocation: 'Office',
            location: 'Office',
            quantity: '8',
            condition: 'Defect',
          },
        ],
      },
      draftSyncState: { status: 'synced' },
    })

    const erAux = summary.items.find(
      (item) => item.inspectionType === 'ER Aux Equipment Inspection',
    )
    expect(erAux?.status).toBe('needs_attention')
    expect(erAux?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'evidence',
        }),
      ]),
    )
  })
})
