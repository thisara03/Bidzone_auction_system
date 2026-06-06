import { NextResponse } from 'next/server'
import { isDbConnectionError } from '@/lib/mongodb'
import { getMissingServerEnv, isMissingEnvError, isInvalidEnvError, validateServerEnv } from '@/lib/env'

/** Map API errors to JSON responses (config, DB, generic). */
export function apiErrorResponse(err: unknown, logLabel: string): NextResponse {
  if (isMissingEnvError(err)) {
    const missing = getMissingServerEnv()
    console.error(`[${logLabel}] Missing env:`, missing.join(', '))
    return NextResponse.json(
      {
        error: 'Server configuration incomplete',
        missing,
        hint: 'Add these in Vercel → Project Settings → Environment Variables, then Redeploy.',
      },
      { status: 503 },
    )
  }

  if (isInvalidEnvError(err)) {
    const issues = validateServerEnv().filter((i) => i.code !== 'missing')
    console.error(`[${logLabel}] Invalid env configuration`)
    return NextResponse.json(
      {
        error: 'Server configuration invalid',
        issues: issues.map((i) => ({ code: i.code, variable: i.variable })),
        hint: 'Use strong secrets in production. See bidzone-next/.env.example',
      },
      { status: 503 },
    )
  }

  if (isDbConnectionError(err)) {
    console.error(`[${logLabel}] Database connection failed`)
    return NextResponse.json(
      {
        error: 'Database unavailable',
        hint: 'Check MONGODB_URI and MongoDB Atlas Network Access (allow 0.0.0.0/0 for Vercel).',
      },
      { status: 503 },
    )
  }

  console.error(`[${logLabel}]`, err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
