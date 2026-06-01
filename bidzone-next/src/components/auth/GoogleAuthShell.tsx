'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import type { ReactNode } from 'react'
import { ClientOnly } from '@/components/ClientOnly'
import { googleOAuthClientId } from '@/lib/googleAuth'

export function GoogleAuthShell({ children }: { children: ReactNode }) {
  const clientId = googleOAuthClientId()
  if (!clientId) return <>{children}</>

  return (
    <ClientOnly fallback={children}>
      <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
    </ClientOnly>
  )
}
