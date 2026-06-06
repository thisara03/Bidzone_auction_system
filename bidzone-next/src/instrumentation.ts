/**
 * Runs once when a Next.js server instance starts (including Vercel serverless cold starts).
 * Validates that required env vars are present — logs issues without printing values.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { validateServerEnv } = await import('@/lib/env')
  const issues = validateServerEnv()
  if (issues.length > 0) {
    console.error(
      '[BidZone] Server env misconfigured:',
      issues.map((i) => `${i.variable}:${i.code}`).join(', '),
    )
    console.error(
      '[BidZone] Set MONGODB_URI, JWT_SECRET, etc. in Vercel → Environment Variables, then Redeploy.',
    )
  }
}
