import { describe, expect, it } from 'vitest'
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getFireExtinguisherVisibleChecks,
} from '../types/fire-extinguisher/helpers'
import { extractFireExtinguisherLocator } from '../types/fire-extinguisher/locator'

const buildRow = (overrides = {}) => ({
  id: 'fe:1',
  catalogId: 1,
  canonicalAssetKey: 'catalog:1',
  zone: '1',
  mainLocation: 'Manjung Hub',
  subLocation: 'Reception',
  idLocNo: 'ADO-001',
  barcodeNo: 'SR102014Z060198',
  feType: 'DP 6KG',
  ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
    next[field.key] = ''
    next[field.remarksKey] = ''
    next[field.photosKey] = []
    return next
  }, {}),
  ...overrides,
})

describe('fire extinguisher locator helpers', () => {
  it('extracts locator values from raw serial text and labelled sticker text', () => {
    expect(extractFireExtinguisherLocator('SR102014Z060198')).toBe('SR102014Z060198')
    expect(extractFireExtinguisherLocator('S/N: SR102014Z060198')).toBe('SR102014Z060198')
    expect(extractFireExtinguisherLocator('Serial No: SR102014Z060198')).toBe('SR102014Z060198')
  })

  it('extracts locator values from QR URL query parameters', () => {
    expect(
      extractFireExtinguisherLocator('https://efeis.bomba.gov.my/check?serial=SR102014Z060198'),
    ).toBe('SR102014Z060198')
    expect(extractFireExtinguisherLocator('/inspection/new?mode=scan&code=SR102014Z060198')).toBe(
      'SR102014Z060198',
    )
  })

  it('filters fire extinguisher visible checks to the focused scanned asset', () => {
    const rows = [
      buildRow(),
      buildRow({
        id: 'fe:2',
        catalogId: 2,
        canonicalAssetKey: 'catalog:2',
        idLocNo: 'ADO-002',
        barcodeNo: 'SR102014Z060199',
      }),
    ]

    const visible = getFireExtinguisherVisibleChecks({
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      fireExtinguisherFocusedAssetKey: 'catalog:2',
      fireExtinguisherCatalogRows: rows,
    })

    expect(visible).toHaveLength(1)
    expect(visible[0]).toEqual(expect.objectContaining({ barcodeNo: 'SR102014Z060199' }))
  })
})
