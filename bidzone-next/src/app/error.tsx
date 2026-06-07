'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="app-error">
      <div className="app-error__card">
        <h1>Something went wrong</h1>
        <p>The page could not load. This is often fixed by refreshing or signing in again.</p>
        <div className="app-error__actions">
          <button type="button" className="app-error__btn" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="app-error__link">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
