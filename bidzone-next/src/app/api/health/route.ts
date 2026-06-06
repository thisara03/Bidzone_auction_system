import { NextResponse } from 'next/server'
import { getMissingServerEnv, getGoogleClientId } from '@/lib/env'

/** Public health check — shows whether required env vars are present (not their values). */
export async function GET() {
  const missing = getMissingServerEnv()
  const ok = missing.length === 0

  return NextResponse.json(
    {
      ok,
      missing,
      googleOAuthConfigured: Boolean(getGoogleClientId()),
      hint: ok
        ? undefined
        : 'Set missing variables in Vercel → Environment Variables, then Redeploy (Deployments → ⋯ → Redeploy).',
    },
    { status: ok ? 200 : 503 },
  )
}
