import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runRoot = mkdtempSync(path.join(tmpdir(), 'vmecc-pwa-update-'))
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js')

const buildRelease = (buildId, outputName) => {
  const outputPath = path.join(runRoot, outputName)
  execFileSync(process.execPath, [viteCli, 'build'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      VITE_BUILD_ID: buildId,
      VITE_OUT_DIR: outputPath,
    },
    stdio: 'inherit',
  })
  return outputPath
}

try {
  const buildA = buildRelease('pwa-audit-build-a', 'build-a')
  const buildB = buildRelease('pwa-audit-build-b', 'build-b')

  execFileSync(
    process.execPath,
    [playwrightCli, 'test', 'tests/e2e/pwa-update.spec.js', '--config=playwright.config.mjs'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        VMECC_PWA_BUILD_A: buildA,
        VMECC_PWA_BUILD_B: buildB,
      },
      stdio: 'inherit',
    },
  )
} finally {
  rmSync(runRoot, { force: true, recursive: true })
}
