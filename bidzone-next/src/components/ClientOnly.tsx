'use client'

import { useEffect, useState, type ReactNode } from 'react'

/** Renders children only in the browser — avoids SSR/hydration issues with window-only APIs. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <>{fallback}</>
  return <>{children}</>
}
