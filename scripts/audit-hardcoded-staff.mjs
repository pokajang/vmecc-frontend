import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..', 'src')
const TARGET_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const BLOCKLIST = [
  'Azhar Rahman',
  'Alicia Tan',
  'Nora Ismail',
  'Dina Sulaiman',
  'Zul Ariff',
  'Agus',
  'Audit Admin',
  'Audit Contract',
  'Audit Finance',
  'Audit HR',
  'Audit Incident Commander',
  'Audit Legacy Create',
]

const SKIP_PATH_PARTS = ['node_modules', 'dist', 'build']

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (SKIP_PATH_PARTS.some((part) => fullPath.includes(`${path.sep}${part}${path.sep}`))) return
    if (entry.isDirectory()) {
      walk(fullPath, files)
      return
    }
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath)
  })
  return files
}

const findings = []
const files = walk(ROOT)

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, idx) => {
    BLOCKLIST.forEach((term) => {
      if (line.includes(term)) {
        findings.push({
          file: path.relative(path.resolve(SCRIPT_DIR, '..'), filePath),
          line: idx + 1,
          term,
        })
      }
    })
  })
})

if (findings.length === 0) {
  console.log('No hardcoded staff literals found.')
  process.exit(0)
}

console.error('Hardcoded staff literals found:')
findings.forEach((hit) => {
  console.error(`- ${hit.file}:${hit.line} [${hit.term}]`)
})
process.exit(1)
