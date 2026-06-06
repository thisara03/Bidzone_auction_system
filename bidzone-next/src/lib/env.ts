/**
 * Server-side environment variables.
 * Values must be set in Vercel → Project Settings → Environment Variables
 * (or in bidzone-next/.env.local for local dev). .env.local is not deployed.
 */

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

export function getMongoUri(): string | undefined {
  return firstNonEmpty(
    process.env.MONGODB_URI,
    process.env.MONGODB_URL,
    process.env.DATABASE_URL,
    process.env.MONGO_URI,
  )
}

export function getJwtSecret(): string | undefined {
  return firstNonEmpty(process.env.JWT_SECRET, process.env.AUTH_SECRET)
}

export function getAdminEmails(): string {
  return process.env.ADMIN_EMAILS ?? ''
}

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export type MissingEnvVar = 'MONGODB_URI' | 'JWT_SECRET'

export function getMissingServerEnv(): MissingEnvVar[] {
  const missing: MissingEnvVar[] = []
  if (!getMongoUri()) missing.push('MONGODB_URI')
  if (!getJwtSecret()) missing.push('JWT_SECRET')
  return missing
}

export function isMissingEnvError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('MISSING_ENV:')
}

export function missingEnvError(name: MissingEnvVar): Error {
  return new Error(
    `MISSING_ENV:${name} — Add ${name} in Vercel → Settings → Environment Variables, then redeploy.`,
  )
}
