import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'

import routes from '../routes'

const guideRouteFamilies = [
  ['dashboard', '/dashboard'],
  ['profile', '/profile'],
  ['messages', '/messages'],
  ['leave-management', '/staff/leave-management'],
  ['leave', '/leave'],
  ['overtime-management', '/staff/overtime-management'],
  ['overtime', '/overtime'],
  ['salary-claims', '/staff/salary-claims/salary'],
  ['payroll-configuration', '/staff/set-salary/set-salary'],
  ['overtime-rate-settings', '/staff/set-salary/set-ot-rate'],
  ['payroll', '/payroll'],
  ['users', '/admin/users'],
  ['staff', '/staff/details'],
  ['teams', '/team/details'],
  ['roster', '/roster/overview'],
  ['inspection', '/inspection'],
  ['erco', '/report/erco'],
  ['drill', '/report/drill'],
  ['fitness', '/report/fitness-test'],
  ['reports', '/report/erco'],
  ['settings', '/settings'],
  ['settings-role-permissions', '/settings/role-permissions'],
  ['settings-dashboard-visibility', '/settings/dashboard-visibility'],
  ['settings-module-activation', '/settings/modules'],
  ['reporting-settings', '/reporting-settings/inspection'],
  ['workflow-notifications', '/notifications/workflow'],
  ['audit', '/admin/audit'],
  ['ai-helper-admin-knowledge', '/admin/ai-helper-knowledge'],
  ['ai-helper-admin-reports', '/admin/ai-helper-reports'],
]

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendSourceDirectory = path.resolve(testDirectory, '..')
const guideDirectory = path.resolve(
  testDirectory,
  '../../../vmecc-backend/database/ai-helper-system-guides',
)

const readSourceTree = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return readSourceTree(entryPath)
      return /\.(?:js|jsx)$/.test(entry.name) ? [fs.readFileSync(entryPath, 'utf8')] : []
    })
    .join('\n')

const composedOrServerLabels = new Set([
  'Current password is incorrect',
  'New Drill Report',
  'New ERCO Report',
  'New Fitness Test Report',
  'pending verification',
])

describe('Ask AI system-guide route contract', () => {
  it.each(guideRouteFamilies)('%s resolves to a production frontend route', (_family, path) => {
    expect(
      routes.some((route) =>
        route.path ? Boolean(matchPath({ path: route.path, end: true }, path)) : false,
      ),
    ).toBe(true)
  })

  it('keeps every emphasized user label grounded in the implemented interface', () => {
    const sourceText = readSourceTree(frontendSourceDirectory)
    const missingLabels = fs
      .readdirSync(guideDirectory)
      .filter((file) => file.endsWith('.md'))
      .flatMap((file) => {
        const content = fs.readFileSync(path.join(guideDirectory, file), 'utf8')
        return [...content.matchAll(/\*\*([^*\r\n]+)\*\*/g)].map((match) => ({
          file,
          label: match[1],
        }))
      })
      .filter(({ label }) => !sourceText.includes(label) && !composedOrServerLabels.has(label))

    expect(missingLabels).toEqual([])
  })
})
