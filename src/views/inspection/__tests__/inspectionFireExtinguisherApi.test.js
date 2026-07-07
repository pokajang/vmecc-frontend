import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadCachedFireExtinguisherCatalog,
  normalizeFireExtinguisherCatalogRows,
  normalizeFireExtinguisherCoverageRows,
  normalizeFireExtinguisherLastInspection,
  saveCachedFireExtinguisherCatalog,
} from '../inspectionFireExtinguisherApi'

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  vi.stubGlobal('window', { localStorage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('inspectionFireExtinguisherApi', () => {
  it('treats seeded rows loaded from cache as editable and deletable by default', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 101,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-001',
        barcodeNo: 'EE042021Y544896',
        feType: 'DP 6KG',
      },
    ])

    expect(row).toMatchObject({
      equipmentSource: 'seed',
      canonicalAssetKey: 'catalog:101',
      activeIdentityKey: '',
      canEdit: true,
      canDelete: true,
    })
  })

  it('prefers explicit backend canonical identity over frontend fallbacks', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 105,
        catalogId: 105,
        canonicalAssetKey: 'identity:backend-key',
        activeIdentityKey: 'backend-key',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-005',
        barcodeNo: 'EE042021Y544900',
      },
    ])

    expect(row).toMatchObject({
      catalogId: 105,
      canonicalAssetKey: 'identity:backend-key',
      activeIdentityKey: 'backend-key',
    })
  })

  it('still respects explicit backend restrictions when flags are false', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 102,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-002',
        barcodeNo: 'EE042021Y544897',
        feType: 'CO2 5KG',
        canEdit: false,
        canDelete: false,
      },
    ])

    expect(row).toMatchObject({
      canEdit: false,
      canDelete: false,
    })
  })

  it('preserves explicit false restrictions in the current cache version', () => {
    saveCachedFireExtinguisherCatalog('Manjung Hub', 'Reception', [
      {
        id: 103,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-003',
        barcodeNo: 'EE042021Y544898',
        feType: 'DP 4KG',
        canEdit: false,
        canDelete: false,
      },
    ])

    const [row] = loadCachedFireExtinguisherCatalog('Manjung Hub', 'Reception')

    expect(row).toMatchObject({
      canEdit: false,
      canDelete: false,
    })
  })

  it('separates cached rows by zone, main location, and sub-location', () => {
    saveCachedFireExtinguisherCatalog('1', 'Manjung Hub', 'Reception', [
      {
        id: 201,
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-001',
      },
    ])
    saveCachedFireExtinguisherCatalog('5', 'Manjung Hub', 'Reception', [
      {
        id: 202,
        zone: '5',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'PORT-001',
      },
    ])

    expect(loadCachedFireExtinguisherCatalog('1', 'Manjung Hub', 'Reception')[0]).toMatchObject({
      idLocNo: 'ADO-001',
    })
    expect(loadCachedFireExtinguisherCatalog('5', 'Manjung Hub', 'Reception')[0]).toMatchObject({
      idLocNo: 'PORT-001',
    })
  })

  it('migrates old cached seeded rows away from legacy protected flags', () => {
    localStorage.setItem(
      'inspection_fire_extinguisher_catalog_cache_v1_manjung hub_reception',
      JSON.stringify({
        data: [
          {
            id: 104,
            source: 'seed',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            idLocNo: 'ADO-004',
            barcodeNo: 'EE042021Y544899',
            feType: 'DP 4KG',
            canEdit: false,
            canDelete: false,
          },
        ],
      }),
    )

    const [row] = loadCachedFireExtinguisherCatalog('Manjung Hub', 'Reception')

    expect(row).toMatchObject({
      equipmentSource: 'seed',
      canEdit: true,
      canDelete: true,
    })
  })

  it('normalizes latest submitted inspection metadata from backend rows', () => {
    expect(
      normalizeFireExtinguisherLastInspection({
        last_inspection: {
          inspected_at: '2026-07-06T09:42:00+08:00',
          inspected_by: 'Jang',
          report_id: 72,
          display_id: 'INS-72',
        },
      }),
    ).toMatchObject({
      inspectedAt: '2026-07-06T09:42:00+08:00',
      submittedAt: '2026-07-06T09:42:00+08:00',
      inspectedBy: 'Jang',
      submittedBy: 'Jang',
      reportId: '72',
      displayId: 'INS-72',
    })
  })

  it('keeps last submitted inspection metadata on normalized catalog rows', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 301,
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-301',
        lastInspection: {
          submittedAt: '2026-07-05T10:00:00+08:00',
          submittedBy: 'Ahmad',
        },
      },
    ])

    expect(row.lastInspection).toMatchObject({
      inspectedAt: '2026-07-05T10:00:00+08:00',
      inspectedBy: 'Ahmad',
    })
  })

  it('normalizes fire extinguisher coverage rows for the master table contract', () => {
    const [row] = normalizeFireExtinguisherCoverageRows([
      {
        id: 501,
        catalog_id: 77,
        main_location: 'Manjung Hub',
        sub_location: 'Reception',
        id_loc_no: 'ADO-501',
        barcode_no: 'BAR-501',
        fe_type: 'CO² 5KG',
        days_left_to_expire: '-2',
        latest_inspection_at: '2026-07-07T10:00:00+08:00',
        inspected_by: 'Jang',
        issue_count: 1,
        evidence_count: 2,
        duplicate_count: 3,
        latest_report_id: 'INS-501',
      },
    ])

    expect(row).toMatchObject({
      catalogId: 77,
      location: 'Manjung Hub',
      subLocation: 'Reception',
      idLocNo: 'ADO-501',
      barcodeNo: 'BAR-501',
      feType: 'CO2 5KG',
      daysLeft: '-2',
      latestInspectionAt: '2026-07-07T10:00:00+08:00',
      inspectedBy: 'Jang',
      issueCount: 1,
      evidenceCount: 2,
      reportCount: 3,
      duplicateCount: 3,
      latestReportId: 'INS-501',
    })
  })
})
