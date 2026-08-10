import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PERSONAS } = require('../tests/e2e/live-uat/live-uat-support.js')
const requestedArgument = process.argv.find((argument) => argument.startsWith('--personas='))
const requested = requestedArgument
  ? requestedArgument
      .slice('--personas='.length)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : Object.keys(PERSONAS)
const unknown = requested.filter((key) => !PERSONAS[key])
if (unknown.length) {
  console.error(`Unknown live UAT persona keys: ${unknown.join(', ')}`)
  process.exit(2)
}

const available = []
const missing = []
for (const key of requested) {
  const persona = PERSONAS[key]
  const absent = [persona.emailVariable, persona.passwordVariable].filter(
    (variable) => !String(process.env[variable] || '').trim(),
  )
  if (absent.length) missing.push({ key, variables: absent })
  else available.push(key)
}

console.log(`Available persona keys: ${available.join(', ') || 'none'}`)
if (missing.length) {
  console.error('Live UAT credential preflight blocked:')
  for (const item of missing) console.error(`- ${item.key}: ${item.variables.join(', ')}`)
  process.exit(2)
}
console.log(`Credential preflight passed for ${available.length}/${requested.length} personas.`)
