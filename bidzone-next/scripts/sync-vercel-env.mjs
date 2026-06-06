#!/usr/bin/env node
/**
 * Push variables from .env.local to the linked Vercel project.
 * Never logs secret values. Requires Vercel CLI login + project link.
 *
 * Usage:
 *   npx vercel login && npx vercel link
 *   npm run vercel:sync-env
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

function validateBeforePush(vars) {
  const errors = []
  if (!vars.MONGODB_URI?.startsWith('mongodb')) {
    errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://')
  }
  if (!vars.JWT_SECRET || vars.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters')
  }
  if (/<[^>]+>/.test(vars.MONGODB_URI ?? '')) {
    errors.push('MONGODB_URI still contains placeholder angle brackets')
  }
  return errors
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
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  if (result.status !== 0) {
    console.error(`Failed to set ${key} for ${target} (value not printed).`)
    return false
  }
  console.log(`✓ ${key} → ${target}`)
  return true
}

if (!existsSync(envPath)) {
  console.error('Missing .env.local — copy from .env.example:  copy .env.example .env.local')
  process.exit(1)
}

const vars = parseEnvFile(readFileSync(envPath, 'utf8'))
const missing = REQUIRED.filter((k) => !vars[k]?.trim())
if (missing.length) {
  console.error('Missing in .env.local:', missing.join(', '))
  process.exit(1)
}

const validationErrors = validateBeforePush(vars)
if (validationErrors.length) {
  console.error('Refusing to sync weak or invalid configuration:')
  validationErrors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}

console.log('Syncing required env vars to Vercel (production + preview + development)…')
console.log('Secret values are never printed.\n')

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
