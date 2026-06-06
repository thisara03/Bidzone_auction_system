#!/usr/bin/env node
/**
 * Push variables from .env.local to the linked Vercel project.
 * Usage: node scripts/sync-vercel-env.mjs
 * Requires: vercel CLI logged in (`npx vercel login`) and project linked (`npx vercel link` in bidzone-next).
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ADMIN_EMAILS',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
]

function parseEnvFile(content) {
  const vars = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

function addEnv(key, value, target) {
  const result = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, target, '--force'],
    {
      input: value,
      encoding: 'utf8',
      cwd: root,
      shell: true,
    },
  )
  if (result.status !== 0) {
    console.error(`Failed to set ${key} for ${target}:`, result.stderr || result.stdout)
    return false
  }
  console.log(`✓ ${key} → ${target}`)
  return true
}

if (!existsSync(envPath)) {
  console.error('Missing .env.local — create it from .env.example first.')
  process.exit(1)
}

const vars = parseEnvFile(readFileSync(envPath, 'utf8'))
const missing = REQUIRED.filter((k) => !vars[k]?.trim())
if (missing.length) {
  console.error('Missing in .env.local:', missing.join(', '))
  process.exit(1)
}

console.log('Syncing env vars to Vercel (production + preview + development)…\n')

let ok = true
for (const key of REQUIRED) {
  for (const target of ['production', 'preview', 'development']) {
    if (!addEnv(key, vars[key], target)) ok = false
  }
}

if (!ok) {
  console.error('\nSome variables failed. Run: npx vercel link (in bidzone-next) then retry.')
  process.exit(1)
}

console.log('\nDone. Redeploy on Vercel: Deployments → ⋯ → Redeploy')
