import { spawnSync } from 'node:child_process'

const command =
  'npx eslint src/views/payroll/Payroll.js --rule react-hooks/rules-of-hooks:error --rule react-hooks/purity:off --rule prettier/prettier:off'
const result = spawnSync(command, {
  shell: true,
  stdio: 'inherit',
})

process.exit(typeof result.status === 'number' ? result.status : 1)
