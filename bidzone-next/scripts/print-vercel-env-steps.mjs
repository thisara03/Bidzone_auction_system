#!/usr/bin/env node
/**
 * Prints exact Vercel env var names to configure (values from .env.local, masked).
 * Run: node scripts/print-vercel-env-steps.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

const KEYS = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAILS', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID']

function parse(content) {
  const out = {}
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

function mask(key, value) {
  if (!value) return '(missing — set in .env.local first)'
  if (key === 'MONGODB_URI') return value.replace(/:([^@/]+)@/, ':***@')
  if (key.includes('SECRET')) return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`
  return value.length > 20 ? `${value.slice(0, 12)}…` : value
}

if (!existsSync(envPath)) {
  console.error('No .env.local found. Run: copy .env.example .env.local')
  process.exit(1)
}

const vars = parse(readFileSync(envPath, 'utf8'))

console.log(`
Vercel → Project → Settings → Environment Variables
Add each variable for Production + Preview + Development, then Redeploy.

Root Directory must be: bidzone-next

`)
for (const key of KEYS) {
  console.log(`${key}`)
  console.log(`  Preview: ${mask(key, vars[key])}`)
  console.log('')
}

console.log(`Or automate after: npx vercel login && npx vercel link && npm run vercel:sync-env
`)
