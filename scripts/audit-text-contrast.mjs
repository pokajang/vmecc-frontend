import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const sourceRoot = path.resolve(process.cwd(), 'src')
const relevantExtensions = new Set(['.js', '.jsx', '.scss'])
const violations = []

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const resolved = path.join(directory, entry.name)
      if (entry.isDirectory()) return collectFiles(resolved)
      return relevantExtensions.has(path.extname(entry.name)) ? [resolved] : []
    }),
  )
  return nestedFiles.flat()
}

const lineNumberAt = (source, index) => source.slice(0, index).split('\n').length

const forbiddenPatterns = [
  {
    pattern: /\btext-body-tertiary\b/g,
    message: 'tertiary text is too faint for application copy; use a semantic foreground token',
  },
  {
    pattern: /var\(--cui-tertiary-color\)/g,
    message: 'tertiary foreground bypasses the application contrast contract',
  },
  {
    pattern: /color\s*:\s*#f3f4f7\b/gi,
    message: 'near-white text is not permitted on light controls',
  },
]

for (const file of await collectFiles(sourceRoot)) {
  const source = await readFile(file, 'utf8')
  const relativePath = path.relative(process.cwd(), file)

  for (const { pattern, message } of forbiddenPatterns) {
    for (const match of source.matchAll(pattern)) {
      violations.push(`${relativePath}:${lineNumberAt(source, match.index)}: ${message}`)
    }
  }
}

const basePath = path.join(sourceRoot, 'scss', 'foundation', '_base.scss')
const baseSource = await readFile(basePath, 'utf8')
const requiredContracts = [
  '--vmecc-fg-default:',
  '--vmecc-fg-supporting:',
  '--vmecc-fg-placeholder:',
  '--vmecc-control-border:',
  '--vmecc-focus-ring:',
  '--vmecc-primary-on-soft:',
  '.btn.btn-outline-light {',
  '.btn.btn-outline-primary {',
  '.btn.btn-outline-success {',
  '.btn.btn-outline-info {',
  '.btn.btn-outline-warning {',
  '.btn.btn-outline-danger {',
  '.fw-semibold.text-muted,',
]
for (const contract of requiredContracts) {
  if (!baseSource.includes(contract)) {
    violations.push(`src/scss/foundation/_base.scss: missing contrast contract "${contract}"`)
  }
}

const selectableControls = [
  ['components/messages/ChatList.js', 'quick filters'],
  ['views/settings/DashboardVisibilityMatrix.js', 'dashboard view toggles'],
  [
    'views/staff/salary-claims-management/components/SalaryAssignmentFormPage.js',
    'salary assignment steps',
  ],
  ['views/inspection/form/components/InspectionSetupSelectorControls.js', 'inspection selectors'],
  ['views/inspection/types/hse/v2Section.js', 'HSE observation choices'],
]
for (const [relativePath, label] of selectableControls) {
  const source = await readFile(path.join(sourceRoot, relativePath), 'utf8')
  if (!source.includes('vmecc-choice-button')) {
    violations.push(`${path.join('src', relativePath)}: ${label} must use vmecc-choice-button`)
  }
}

const hseSource = await readFile(
  path.join(sourceRoot, 'views', 'inspection', 'types', 'hse', 'v2Section.js'),
  'utf8',
)
for (const contract of ['role="radiogroup"', 'role="radio"', 'aria-checked={selected}']) {
  if (!hseSource.includes(contract)) {
    violations.push(`src/views/inspection/types/hse/v2Section.js: missing ${contract}`)
  }
}
if (/\bopacity-(?:50|75)\b/.test(hseSource) || /\bopacity\s*:/.test(hseSource)) {
  violations.push(
    'src/views/inspection/types/hse/v2Section.js: text must not be dimmed with opacity',
  )
}

const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}
const luminance = (hex) =>
  hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const avatarSource = await readFile(path.join(sourceRoot, 'utils', 'avatarColors.js'), 'utf8')
for (const match of avatarSource.matchAll(
  /\{\s*bg:\s*'(#[0-9a-f]{6})',\s*text:\s*'(#[0-9a-f]{6})'\s*\}/gi,
)) {
  const ratio = contrast(match[2], match[1])
  if (ratio < 4.5) {
    violations.push(
      `src/utils/avatarColors.js: ${match[2]} on ${match[1]} has insufficient ${ratio.toFixed(2)}:1 contrast`,
    )
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    'Text contrast audit passed: semantic contracts and high-risk controls are protected.',
  )
}
