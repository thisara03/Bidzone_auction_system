/** Origins to register under Google Cloud → OAuth client → Authorized JavaScript origins. */
export function getGoogleOAuthJavascriptOrigins(): string[] {
  const origins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
  ])

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    origins.add(`https://${vercelUrl.replace(/^https?:\/\//, '')}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (appUrl) {
    origins.add(appUrl)
  }

  return [...origins]
}
