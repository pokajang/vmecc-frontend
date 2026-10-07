import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const contracts = [
  {
    primitive: 'WorkflowStageActions',
    files: [
      'src/views/inspection/form/components/InspectionFormActions.js',
      'src/views/leave/components/LeaveApplySection.js',
      'src/views/overtime/components/OvertimeApplySection.js',
      'src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js',
      'src/views/payroll/components/claim-form/SalaryClaimBody.js',
      'src/views/report/components/ReportWorkflowUi.js',
      'src/views/report/drill/DrillStageActions.js',
      'src/views/report/er-assessment/ErAssessmentForm.js',
      'src/views/report/erco/erco-form-components/DetailsStepActions.js',
      'src/views/report/fitness-test/FitnessStageActions.js',
    ],
  },
  {
    primitive: 'RecordDetailActions',
    files: [
      'src/views/inspection/records/InspectionDetailActionBar.js',
      'src/views/leave/components/LeaveDetailSection.js',
      'src/views/overtime/components/OvertimeDetailSection.js',
      'src/views/payroll/components/ClaimDetailSection.js',
      'src/views/report/components/ReportDetailSection.js',
    ],
  },
]

const applicationFiles = [
  'src/views/leave/components/LeaveApplySection.js',
  'src/views/overtime/components/OvertimeApplySection.js',
  'src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js',
  'src/views/payroll/components/claim-form/SalaryClaimBody.js',
]

const violations = []
for (const contract of contracts) {
  for (const relativePath of contract.files) {
    const source = await readFile(path.resolve(process.cwd(), relativePath), 'utf8')
    if (!source.includes(contract.primitive)) {
      violations.push(`${relativePath}: must use ${contract.primitive}`)
    }
  }
}

for (const relativePath of applicationFiles) {
  const source = await readFile(path.resolve(process.cwd(), relativePath), 'utf8')
  if (/\bclear form\b/i.test(source)) {
    violations.push(`${relativePath}: mobile application flow must not expose a Clear form action`)
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  const checkedFiles = new Set([
    ...contracts.flatMap((contract) => contract.files),
    ...applicationFiles,
  ]).size
  console.log(
    `Mobile action seam audit passed: ${checkedFiles} critical workflow files use the shared stage/detail action contracts.`,
  )
}
