const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const buildSeedRows = (sectionKey, rows) =>
  rows.map((row, index) => {
    const [location, brand, serialNo, size = '', cylinderType = ''] = row
    return {
      id: `${sectionKey}:${slugSegment(location)}:${slugSegment(brand)}:${slugSegment(serialNo)}`,
      sectionKey,
      rowNumber: index + 1,
      location: String(location || '').trim(),
      mainLocation: String(location || '').trim(),
      brand: String(brand || '').trim(),
      serialNo: String(serialNo || '').trim(),
      size: String(size || '').trim(),
      cylinderType: String(cylinderType || '').trim(),
    }
  })

const SCBA_REFERENCE = {
  sourceWorkbook: 'report-reference/VMM SCBA Inspection Checklist.xlsx',
  mainLocations: ['FRT', 'FRT (Spare)', 'Store'],
  sections: [
    {
      key: 'backPlate',
      title: 'Back Plate',
      shortLabel: 'Back Plate',
      sourceTitle: 'Back Plate',
      fields: [
        {
          key: 'backPlateHarnessCondition',
          label: 'Back Plate & Harness',
          sourceLabel: 'Back Plate and Harness Condition',
          kind: 'status',
        },
        {
          key: 'highPressureHose',
          label: 'High Pressure Hose',
          sourceLabel: 'High Pressure Hose',
          kind: 'status',
        },
        {
          key: 'pressureGauge',
          label: 'Pressure Gauge',
          sourceLabel: 'Pressure Gauge',
          kind: 'status',
        },
        { key: 'alarmDevice', label: 'Alarm Device', sourceLabel: 'Alarm Device', kind: 'status' },
        { key: 'demandValve', label: 'Demand Valve', sourceLabel: 'Demand Valve', kind: 'status' },
        { key: 'sealing', label: 'Sealing', sourceLabel: 'Sealing', kind: 'status' },
        { key: 'cleanliness', label: 'Cleanliness', sourceLabel: 'Cleanliness', kind: 'status' },
      ],
      seedRows: [
        ['Store', 'MSA', '01'],
        ['FRT (Spare)', 'MSA', '02'],
        ['Store', 'MSA', '03'],
        ['FRT (Spare)', 'MSA', '04'],
        ['Store', 'MSA', '05'],
        ['FRT', 'MSA', '06'],
        ['FRT', 'MSA', '07'],
        ['Store', 'MSA', '08'],
        ['Store', 'MSA', '09'],
        ['Store', 'MSA', '10'],
        ['Store', 'MSA', '11'],
        ['FRT', 'MSA', '12'],
        ['Store', 'MSA', '13'],
        ['FRT', 'MSA', '14'],
        ['Store', 'MSA', '15'],
        ['Store', 'Drager', '01'],
        ['Store', 'Drager', '02'],
        ['FRT', 'Drager', '03'],
        ['FRT', 'Drager', '04'],
        ['Store', 'Drager', '05'],
        ['Store', 'Drager', '06'],
        ['Store', 'Drager', '07'],
        ['FRT', 'Drager', '08'],
        ['Store', 'Drager', '09'],
        ['Store', 'Drager', '10'],
        ['FRT', 'Drager', '11'],
        ['Store', 'Drager', '12'],
      ],
    },
    {
      key: 'cylinder',
      title: 'Cylinder',
      shortLabel: 'Cylinder',
      sourceTitle: 'Cylinder',
      fields: [
        {
          key: 'servicePressure',
          label: 'Service Pressure (Bar)',
          sourceLabel: 'Service Pressure (Bar)',
          kind: 'text',
        },
        {
          key: 'containedPressure',
          label: 'Contained Pressure (Bar)',
          sourceLabel: 'Contained Pressure (Bar)',
          kind: 'text',
        },
        {
          key: 'physicalCondition',
          label: 'Physical Condition',
          sourceLabel: 'Physical Condition',
          kind: 'status',
        },
        {
          key: 'handwheelCondition',
          label: 'Handwheel Condition',
          sourceLabel: 'Handwheel Condition',
          kind: 'status',
        },
        {
          key: 'valveBodyCondition',
          label: 'Valve Body Condition',
          sourceLabel: 'Valve Body Condition',
          kind: 'status',
        },
        {
          key: 'screwPlugCondition',
          label: 'Screw Plug Condition',
          sourceLabel: 'Screw Plug Condition',
          kind: 'status',
        },
        { key: 'cleanliness', label: 'Cleanliness', sourceLabel: 'Cleanliness', kind: 'status' },
      ],
      seedRows: [
        ['Store', 'MSA', '6.8L/01', '6.8', 'Composite'],
        ['FRT (Spare)', 'MSA', '6.8L/02', '6.8', 'Composite'],
        ['FRT (Spare)', 'MSA', '6.8L/03', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/04', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/05', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/06', '6.8', 'Composite'],
        ['FRT (Spare)', 'MSA', '6.8L/07', '6.8', 'Composite'],
        ['FRT', 'MSA', '6.8L/08', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/09', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/10', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/11', '6.8', 'Composite'],
        ['FRT (Spare)', 'MSA', '6.8L/12', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/13', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/14', '6.8', 'Composite'],
        ['Store', 'MSA', '6.8L/15', '6.8', 'Composite'],
        ['Store', 'Drager', '6L/01', '6', 'Steel'],
        ['Store', 'Drager', '6L/02', '6', 'Steel'],
        ['Store', 'Drager', '6L/03', '6', 'Steel'],
        ['Store', 'Drager', '6L/04', '6', 'Steel'],
        ['Store', 'Drager', '6L/05', '6', 'Steel'],
        ['Store', 'Drager', '6L/06', '6', 'Steel'],
        ['Store', 'Drager', '6L/07', '6', 'Steel'],
        ['Store', 'Drager', '6L/08', '6', 'Steel'],
        ['Store', 'Drager', '6L/09', '6', 'Steel'],
        ['Store', 'Drager', '6L/10', '6', 'Steel'],
        ['Store', 'Drager', '6L/11', '6', 'Steel'],
        ['Store', 'Drager', '6L/12', '6', 'Steel'],
        ['Store', 'Drager', '9L/01', '9', 'Composite'],
        ['Store', 'Drager', '9L/02', '9', 'Composite'],
        ['FRT', 'Drager', '9L/03', '9', 'Composite'],
        ['Store', 'Drager', '9L/04', '9', 'Composite'],
        ['FRT', 'Drager', '9L/05', '9', 'Composite'],
        ['Store', 'Drager', '9L/06', '9', 'Composite'],
        ['Store', 'Drager', '9L/07', '9', 'Composite'],
        ['FRT', 'Drager', '9L/08', '9', 'Composite'],
      ],
    },
    {
      key: 'faceMask',
      title: 'Face Mask',
      shortLabel: 'Face Mask',
      sourceTitle: 'Face Mask',
      fields: [
        {
          key: 'visorCondition',
          label: 'Visor Condition',
          sourceLabel: 'Visor Condition',
          kind: 'status',
        },
        { key: 'ldvPort', label: 'LDV Port', sourceLabel: 'LDV Port', kind: 'status' },
        {
          key: 'ldvReleaseButton',
          label: 'LDV Release Button',
          sourceLabel: 'LDV Release Button',
          kind: 'status',
        },
        { key: 'leakTest', label: 'Leak Test', sourceLabel: 'Leak Test', kind: 'status' },
        {
          key: 'speechDiaphragm',
          label: 'Speech Diaphragm',
          sourceLabel: 'Speech Diaphragm',
          kind: 'status',
        },
        { key: 'harness', label: 'Harness', sourceLabel: 'Harness', kind: 'status' },
        { key: 'neckStrap', label: 'Neck Strap', sourceLabel: 'Neck Strap', kind: 'status' },
      ],
      seedRows: [
        ['Store', 'MSA', '01'],
        ['Store', 'MSA', '02'],
        ['Store', 'MSA', '03'],
        ['Store', 'MSA', '04'],
        ['Store', 'MSA', '05'],
        ['Store', 'MSA', '06'],
        ['FRT', 'MSA', '07'],
        ['Store', 'MSA', '08'],
        ['FRT', 'MSA', '09'],
        ['FRT', 'MSA', '10'],
        ['Store', 'MSA', '11'],
        ['Store', 'MSA', '12'],
        ['Store', 'MSA', '13'],
        ['FRT', 'MSA', '14'],
        ['Store', 'MSA', '15'],
        ['Store', 'Drager', '01'],
        ['FRT', 'Drager', '02'],
        ['FRT', 'Drager', '03'],
        ['FRT', 'Drager', '04'],
        ['FRT', 'Drager', '05'],
        ['FRT', 'Drager', '06'],
        ['Store', 'Drager', '07'],
        ['Store', 'Drager', '08'],
        ['Store', 'Drager', '09'],
        ['Store', 'Drager', '10'],
        ['FRT', 'Drager', '11'],
        ['FRT', 'Drager', '12'],
      ],
    },
  ],
}

export const SCBA_SECTION_DEFINITIONS = SCBA_REFERENCE.sections.map((section) => ({
  key: section.key,
  title: section.title,
  shortLabel: section.shortLabel,
  sourceTitle: section.sourceTitle,
  sourceWorkbook: SCBA_REFERENCE.sourceWorkbook,
  supportedMainLocations: SCBA_REFERENCE.mainLocations,
  rows: buildSeedRows(section.key, section.seedRows),
  fields: section.fields.map((field) => ({ ...field })),
}))

const sectionByKey = new Map(SCBA_SECTION_DEFINITIONS.map((entry) => [entry.key, entry]))

export const SCBA_BACK_PLATE_FIELDS = sectionByKey.get('backPlate')?.fields || []
export const SCBA_CYLINDER_FIELDS = sectionByKey.get('cylinder')?.fields || []
export const SCBA_FACE_MASK_FIELDS = sectionByKey.get('faceMask')?.fields || []
