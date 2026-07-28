import { ClipboardCheck } from 'lucide-react'

export const FITNESS_FORM_VERSION = 3
export const FITNESS_REPORT_OPTION = {
  value: 'Physical Test Report',
  title: 'Monthly Physical Test',
  description: 'Record fitness and proficiency results for every participating shift member.',
  icon: ClipboardCheck,
}
export const FITNESS_TEST_TYPE_OPTIONS = [FITNESS_REPORT_OPTION]

export const FITNESS_PROTOCOL = Object.freeze({
  documentReference: 'VMECC-TRG-001',
  revision: '0',
  fitness: { sitUps: 20, jumpingJacks: 50, pushUps: 20, timeLimitSeconds: 60 },
  proficiency: {
    timeLimitSeconds: 300,
    checkpoints: [
      { id: 'cp1', label: 'Don bunker suit and SCBA' },
      { id: 'cp2', label: 'Carry two 2.5-inch fire hoses for 15 m' },
      { id: 'cp3', label: 'Lay one 2.5-inch fire hose' },
      { id: 'cp4', label: 'Carry two 9 kg dry-powder extinguishers for 15 m' },
      { id: 'cp5', label: 'Carry the rope rescue bag for 15 m' },
      { id: 'cp6', label: 'Complete the weight-lifting station for 3 m' },
    ],
  },
})

export const FITNESS_WORKFLOW_STEPS = ['period', 'personnel', 'results', 'signoff']
export const FITNESS_RESULT_LABELS = Object.freeze({
  pass: 'Pass',
  failed: 'Failed',
  incomplete: 'Not tested',
})
export const FITNESS_FIELD_LIMITS = Object.freeze({
  participants: 100,
  count: 999,
  age: 100,
  assessor: 190,
  notes: 4000,
})
