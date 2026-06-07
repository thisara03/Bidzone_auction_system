/**
 * Server-side environment configuration.
 *
 * Uses dynamic `process.env[key]` lookups so Next.js does not inline empty
 * values at build time when secrets are only set in Vercel at runtime.
 *
 * SECURITY: secrets only in `.env.local` (local) or Vercel env vars (production).
 */

const WEAK_JWT_PLACEHOLDERS = new Set([
  'your_super_secret_jwt_key_here',
  'changeme',
  'secret',
  'jwt_secret',
  'bidzone_jwt',
])

const MIN_JWT_SECRET_LENGTH = 32

/** Runtime env read — dynamic key avoids build-time replacement with "". */
function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function getMongoUri(): string | undefined {
  return readEnv('MONGODB_URI', 'MONGODB_URL', 'DATABASE_URL', 'MONGO_URI')
}

export function getJwtSecret(): string | undefined {
  return readEnv('JWT_SECRET', 'AUTH_SECRET')
}

export function getAdminEmails(): string {
  return readEnv('ADMIN_EMAILS') ?? ''
}

export function getGoogleClientId(): string {
  return readEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID') ?? ''
}

export type MissingEnvVar = 'MONGODB_URI' | 'JWT_SECRET'

export type EnvValidationIssue =
  | { code: 'missing'; variable: MissingEnvVar }
  | { code: 'invalid_mongodb_uri'; variable: 'MONGODB_URI' }
  | { code: 'weak_jwt_secret'; variable: 'JWT_SECRET' }

function validateMongoUri(uri: string): EnvValidationIssue | null {
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    return { code: 'invalid_mongodb_uri', variable: 'MONGODB_URI' }
  }
  if (/<[^>]+>/.test(uri)) {
    return { code: 'invalid_mongodb_uri', variable: 'MONGODB_URI' }
  }
  return null
}

function validateJwtSecret(secret: string): EnvValidationIssue | null {
  const normalized = secret.toLowerCase()
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return { code: 'weak_jwt_secret', variable: 'JWT_SECRET' }
  }
  if (WEAK_JWT_PLACEHOLDERS.has(normalized)) {
    return { code: 'weak_jwt_secret', variable: 'JWT_SECRET' }
  }
  return null
}

/** Validate required server env. Strict in production; lenient in local dev. */
export function validateServerEnv(): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = []

  const mongoUri = getMongoUri()
  if (!mongoUri) {
    issues.push({ code: 'missing', variable: 'MONGODB_URI' })
  } else {
    const mongoIssue = validateMongoUri(mongoUri)
    if (mongoIssue) issues.push(mongoIssue)
  }

  const jwtSecret = getJwtSecret()
  if (!jwtSecret) {
    issues.push({ code: 'missing', variable: 'JWT_SECRET' })
  } else if (isProduction()) {
    const jwtIssue = validateJwtSecret(jwtSecret)
    if (jwtIssue) issues.push(jwtIssue)
  }

  return issues
}

export function getMissingServerEnv(): MissingEnvVar[] {
  return validateServerEnv()
    .filter((i): i is { code: 'missing'; variable: MissingEnvVar } => i.code === 'missing')
    .map((i) => i.variable)
}

export function isMissingEnvError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('MISSING_ENV:')
}

export function isInvalidEnvError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('INVALID_ENV:')
}

export function missingEnvError(name: MissingEnvVar): Error {
  return new Error(
    `MISSING_ENV:${name} — Add ${name} in Vercel → Settings → Environment Variables, then redeploy.`,
  )
}

export function invalidEnvError(name: string, detail: string): Error {
  return new Error(`INVALID_ENV:${name} — ${detail}`)
}

function throwForIssue(issue: EnvValidationIssue): never {
  if (issue.code === 'missing') {
    throw missingEnvError(issue.variable)
  }
  if (issue.code === 'invalid_mongodb_uri') {
    throw invalidEnvError(
      'MONGODB_URI',
      'Must be a valid mongodb:// or mongodb+srv:// connection string with real credentials.',
    )
  }
  throw invalidEnvError(
    'JWT_SECRET',
    `Use at least ${MIN_JWT_SECRET_LENGTH} random characters (e.g. openssl rand -base64 48).`,
  )
}

/** MongoDB routes only — does not require JWT_SECRET. */
export function assertMongoEnv(): void {
  const mongoUri = getMongoUri()
  if (!mongoUri) throw missingEnvError('MONGODB_URI')
  const mongoIssue = validateMongoUri(mongoUri)
  if (mongoIssue) throwForIssue(mongoIssue)
}

/** Auth/token routes only — does not require MONGODB_URI. */
export function assertJwtEnv(): void {
  const jwtSecret = getJwtSecret()
  if (!jwtSecret) throw missingEnvError('JWT_SECRET')
  if (isProduction()) {
    const jwtIssue = validateJwtSecret(jwtSecret)
    if (jwtIssue) throwForIssue(jwtIssue)
  }
}

/** Assert all required server env (DB + auth). */
export function assertServerEnv(): void {
  const issues = validateServerEnv()
  for (const issue of issues) {
    throwForIssue(issue)
  }
}
