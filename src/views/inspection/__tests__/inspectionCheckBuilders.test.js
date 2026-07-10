import { describe, expect, it } from 'vitest'
import { buildScbaAllGoodPatch, buildScbaFillBlankGoodPatch } from '../form/inspectionCheckBuilders'

describe('inspectionCheckBuilders', () => {
  it('keeps SCBA fill-blank and force-all-good behavior distinct', () => {
    const fields = [
      { key: 'servicePressure', kind: 'text' },
      { key: 'backPlateHarnessCondition', kind: 'status' },
      { key: 'highPressureHose', kind: 'status' },
      { key: 'pressureGauge', kind: 'status' },
    ]
    const row = {
      servicePressure: '',
      backPlateHarnessCondition: 'Not Good',
      highPressureHose: '',
      pressureGauge: 'Good',
    }

    expect(buildScbaFillBlankGoodPatch(fields, row, 'Good')).toEqual({
      highPressureHose: 'Good',
    })
    expect(buildScbaAllGoodPatch(fields, 'Good')).toEqual({
      backPlateHarnessCondition: 'Good',
      highPressureHose: 'Good',
      pressureGauge: 'Good',
    })
  })
})
