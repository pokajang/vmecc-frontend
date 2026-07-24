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

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const relativePath = path.relative(process.cwd(), file)

  for (const match of source.matchAll(/font-weight\s*:\s*(550|650)\b/g)) {
    violations.push(`${relativePath}: unsupported font weight ${match[1]}`)
  }
  for (const match of source.matchAll(/fontWeight\s*:\s*(550|650)\b/g)) {
    violations.push(`${relativePath}: unsupported inline font weight ${match[1]}`)
  }

  allFontSizeDeclarations += source.match(/font-size\s*:/g)?.length || 0
  semanticFontSizeDeclarations += source.match(/font-size\s*:\s*var\(--vmecc-text-/g)?.length || 0
}

const styleSource = await readFile(path.join(sourceRoot, 'scss', 'style.scss'), 'utf8')
if (!styleSource.includes('@fontsource-variable/manrope/wght.css')) {
  violations.push('src/scss/style.scss: Manrope variable font import is missing')
}
if (!styleSource.includes('$font-family-sans-serif:')) {
  violations.push('src/scss/style.scss: CoreUI font-family configuration is missing')
}

const pageHeaderSource = await readFile(
  path.join(sourceRoot, 'components', 'ModulePageHeader.js'),
  'utf8',
)
if (!pageHeaderSource.includes('vmecc-page-title')) {
  violations.push('src/components/ModulePageHeader.js: semantic page-title class is missing')
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  const directFontSizeDeclarations = allFontSizeDeclarations - semanticFontSizeDeclarations
  console.log(
    `Typography audit passed: ${semanticFontSizeDeclarations} semantic and ${directFontSizeDeclarations} direct font-size declarations.`,
  )
}
