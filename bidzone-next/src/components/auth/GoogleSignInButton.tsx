'use client'

import { GoogleLogin } from '@react-oauth/google'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useGoogleConfig } from '@/context/GoogleConfigContext'
import { useI18n } from '@/context/I18nContext'

/** Google Identity Services button — must render inside GoogleOAuthProvider. */
function GoogleSignInButtonInner() {
  const { loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [btnWidth, setBtnWidth] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const update = () => setBtnWidth(el.offsetWidth)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="lp__google-section-inner">
      <div
        ref={wrapRef}
        className={`lp__google-gis-wrap${loading ? ' lp__google-gis-wrap--loading' : ''}`}
      >
        {btnWidth > 0 && (
          <GoogleLogin
            useOneTap={false}
            theme="filled_black"
            size="large"
            text="continue_with"
            shape="rectangular"
            width={btnWidth}
            onSuccess={async (res) => {
              if (!res.credential) return
              setError(null)
              setLoading(true)
              const r = await loginWithGoogle(res.credential)
              if (r === 'ok') {
                router.replace('/home')
              } else if (r === 'database_unavailable') {
                setError(t('login.errDatabase'))
              } else {
                setError(t('login.errGoogle'))
              }
              setLoading(false)
            }}
            onError={() => {
              setError(
                t('login.errGoogleOrigin').replace('{origin}', window.location.origin),
              )
              setLoading(false)
            }}
          />
        )}
      </div>
      {loading && (
        <p className="lp__google-hint" role="status">
          Signing in…
        </p>
      )}
      {error && (
        <p role="alert" className="lp__google-error">
          {error}
        </p>
      )}
    </div>
  )
}

function GoogleSignInButtonSkeleton() {
  return (
    <div className="lp__g-btn lp__g-btn--skeleton" aria-busy="true">
      <span className="lp__g-btn__icon-slot" />
      <span className="lp__g-btn__label">Continue with Google</span>
    </div>
  )
}

export function GoogleSignInButton() {
  const { t } = useI18n()
  const { clientId, ready } = useGoogleConfig()

  if (!ready) {
    return <GoogleSignInButtonSkeleton />
  }

  if (!clientId) {
    return (
      <p className="lp__google-hint" role="status">
        {t('login.googleNotConfigured')}
      </p>
    )
  }

  return <GoogleSignInButtonInner />
}
