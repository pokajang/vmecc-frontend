import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const sourceRoot = path.resolve(process.cwd(), 'src')
const relevantExtensions = new Set(['.js', '.jsx', '.scss'])

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

const files = await collectFiles(sourceRoot)
const violations = []
let allFontSizeDeclarations = 0
let semanticFontSizeDeclarations = 0
let legacySmallUtilityReferences = 0
const maxDirectFontSizeDeclarations = 63

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const relativePath = path.relative(process.cwd(), file)

  for (const match of source.matchAll(/font-weight\s*:\s*(100|200|300|400|550|650)\b/g)) {
    violations.push(`${relativePath}: unsupported font weight ${match[1]}`)
  }
  for (const match of source.matchAll(/fontWeight\s*:\s*(100|200|300|400|550|650)\b/g)) {
    violations.push(`${relativePath}: unsupported inline font weight ${match[1]}`)
  }

  allFontSizeDeclarations += source.match(/font-size\s*:/g)?.length || 0
  semanticFontSizeDeclarations += source.match(/font-size\s*:\s*var\(--vmecc-text-/g)?.length || 0
  if (['.js', '.jsx'].includes(path.extname(file))) {
    legacySmallUtilityReferences += source.match(/\bsmall\b/g)?.length || 0
  }
}

const styleSource = await readFile(path.join(sourceRoot, 'scss', 'style.scss'), 'utf8')
if (!styleSource.includes('@fontsource-variable/manrope/wght.css')) {
  violations.push('src/scss/style.scss: Manrope variable font import is missing')
}
if (!styleSource.includes('$font-family-sans-serif:')) {
  violations.push('src/scss/style.scss: CoreUI font-family configuration is missing')
}
if (!styleSource.includes('$font-weight-light: 500')) {
  violations.push('src/scss/style.scss: CoreUI light weight must resolve to 500')
}
if (!styleSource.includes('$font-weight-normal: 500')) {
  violations.push('src/scss/style.scss: CoreUI normal weight must resolve to 500')
}

const baseSource = await readFile(path.join(sourceRoot, 'scss', 'foundation', '_base.scss'), 'utf8')
if (!/html\s*\{[^}]*font-size:\s*100%;[^}]*\}/s.test(baseSource)) {
  violations.push('src/scss/foundation/_base.scss: root type scale must use font-size: 100%')
}
if (/@media[^{]*\{[\s\S]*?html\s*\{[^}]*font-size\s*:/m.test(baseSource)) {
  violations.push(
    'src/scss/foundation/_base.scss: breakpoint-specific root font sizing is not allowed',
  )
}
if (!baseSource.includes('--vmecc-touch-target: max(2.75rem, 44px)')) {
  violations.push(
    'src/scss/foundation/_base.scss: touch target must remain independent from the root type scale',
  )
}

const typographySource = await readFile(
  path.join(sourceRoot, 'scss', 'foundation', '_typography.scss'),
  'utf8',
)
const requiredTypographyTokens = new Map([
  ['--vmecc-text-page-title', '1.5rem'],
  ['--vmecc-text-section-title', '1.125rem'],
  ['--vmecc-text-card-title', '1rem'],
  ['--vmecc-text-body', '1rem'],
  ['--vmecc-text-label', '0.9375rem'],
  ['--vmecc-text-meta', '0.875rem'],
  ['--vmecc-text-caption', '0.8125rem'],
  ['--vmecc-text-overlay-title', '1.25rem'],
])
for (const [token, value] of requiredTypographyTokens) {
  if (!typographySource.includes(`${token}: ${value}`)) {
    violations.push(`src/scss/foundation/_typography.scss: ${token} must resolve to ${value}`)
  }
}
if (!typographySource.includes('--vmecc-weight-body: 500')) {
  violations.push('src/scss/foundation/_typography.scss: body weight must remain 500')
}
if (
  !/\.table\s+\.small,\s*\.table\s+small\s*\{[^}]*font-size:\s*var\(--vmecc-text-caption\)/s.test(
    typographySource,
  )
) {
  violations.push(
    'src/scss/foundation/_typography.scss: nested table helper text must use the caption token',
  )
}

const pageHeaderSource = await readFile(
  path.join(sourceRoot, 'components', 'ModulePageHeader.js'),
  'utf8',
)
if (!pageHeaderSource.includes('vmecc-page-title')) {
  violations.push('src/components/ModulePageHeader.js: semantic page-title class is missing')
}

const directFontSizeDeclarations = allFontSizeDeclarations - semanticFontSizeDeclarations
if (directFontSizeDeclarations > maxDirectFontSizeDeclarations) {
  violations.push(
    `Direct font-size declaration budget exceeded: ${directFontSizeDeclarations}/${maxDirectFontSizeDeclarations}`,
  )
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Typography audit passed: ${semanticFontSizeDeclarations} semantic and ${directFontSizeDeclarations} direct font-size declarations; ${legacySmallUtilityReferences} legacy small references tracked.`,
  )
}
