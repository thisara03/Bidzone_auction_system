import { NextResponse } from 'next/server'
import { getGoogleClientId } from '@/lib/env'
import { getGoogleOAuthJavascriptOrigins } from '@/lib/googleOAuthSetup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public runtime config for the browser (non-secret). */
export async function GET() {
  const googleClientId = getGoogleClientId()
  const javascriptOrigins = getGoogleOAuthJavascriptOrigins()

  return NextResponse.json({
    googleClientId,
    /** Add every URL here in Google Cloud → OAuth client → Authorized JavaScript origins */
    googleOAuthJavascriptOrigins: javascriptOrigins,
    googleOAuthSetupHint: googleClientId
      ? `In Google Cloud Console, open OAuth client ${googleClientId.slice(0, 20)}… and add each origin from googleOAuthJavascriptOrigins (no trailing slash). Also add the exact URL you use in the browser if it differs (e.g. http://192.168.x.x:3000).`
      : 'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel / .env.local, then redeploy.',
  })
}
