#!/usr/bin/env node
/**
 * Pre-commit / CI guard: block staged files that look like real env secrets.
 * Usage: node scripts/check-no-secrets.mjs
 *        node scripts/check-no-secrets.mjs --staged   (git pre-commit)
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { extname } from 'node:path'

const staged = process.argv.includes('--staged')

const FORBIDDEN_FILENAMES = [
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
]

const SECRET_PATTERNS = [
  /mongodb\+srv:\/\/[^:]+:[^@]+@/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /AIza[0-9A-Za-z_-]{35}/,
  /sk_live_[0-9a-zA-Z]+/,
  /xox[baprs]-[0-9a-zA-Z-]+/,
]

function listFiles() {
  if (!staged) {
    return []
  }
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8',
    shell: true,
  })
  if (result.status !== 0) return []
  return result.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
}

function scanContent(path, content) {
  const hits = []
  if (FORBIDDEN_FILENAMES.some((f) => path.endsWith(f) || path.includes(`/${f}`))) {
    hits.push('forbidden env filename')
  }
  for (const re of SECRET_PATTERNS) {
    if (re.test(content)) hits.push(`pattern ${re}`)
  }
  return hits
}

const files = listFiles()
let failed = false

for (const file of files) {
  const base = file.split('/').pop() ?? file
  if (FORBIDDEN_FILENAMES.includes(base)) {
    console.error(`✗ Refusing to commit secret file: ${file}`)
    failed = true
    continue
  }
  if (!existsSync(file)) continue
  if (!['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.env', '.example'].includes(extname(file)) && !file.includes('.env')) {
    continue
  }
  try {
    const content = readFileSync(file, 'utf8')
    const hits = scanContent(file, content)
    if (hits.length) {
      console.error(`✗ Possible secret in ${file}: ${hits.join(', ')}`)
      failed = true
    }
  } catch {
    /* ignore binary */
  }
}

if (failed) {
  console.error('\nCommit blocked. Remove secrets and use .env.local (gitignored) or Vercel env vars.')
  process.exit(1)
}

if (staged) {
  console.log('✓ No obvious secrets in staged files')
}
