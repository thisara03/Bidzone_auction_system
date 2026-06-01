'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Eye, EyeOff, Gavel, HelpCircle,
  Lock, Mail, ShieldCheck, Star, TrendingUp,
  User, Zap, Package, ShoppingBag, Store,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { useHelp } from '@/context/HelpContext'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const GoogleSignInButton = dynamic(
  () => import('@/components/auth/GoogleSignInButton').then((m) => m.GoogleSignInButton),
  {
    ssr: false,
    loading: () => (
      <div className="lp__g-btn lp__g-btn--skeleton" aria-busy="true">
        <span className="lp__g-btn__icon-slot" />
        <span className="lp__g-btn__label">Continue with Google</span>
      </div>
    ),
  },
)

const BENEFITS = [
  { icon: ShoppingBag, text: 'Browse 100K+ live auctions every day' },
  { icon: Zap,         text: 'Place bids in real-time with AI coaching' },
  { icon: ShieldCheck, text: 'Buyer protection on every purchase' },
  { icon: Store,       text: 'Upgrade to seller anytime — no extra charge' },
]

const STATS = [
  { icon: User,        value: '50K+',  label: 'Active bidders'  },
  { icon: Package,     value: '100K+', label: 'Items sold'      },
  { icon: TrendingUp,  value: '$50M+', label: 'Total sales'     },
]

export function RegisterPage() {
  const { isAuthenticated, registerBidder } = useAuth()
  const { t } = useI18n()
  const { openHelp } = useHelp()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAuthenticated) router.replace('/home')
    else nameRef.current?.focus()
  }, [isAuthenticated, router])

  if (isAuthenticated) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await registerBidder({
        fullName, email, password,
        address: '', city: '',
      })
      if (r === 'email_taken') {
        setError('That email is already registered. Try signing in instead.')
        return
      }
      router.replace('/home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ob-role">

      {/* ════════════════════════════════
          LEFT HERO
          ════════════════════════════════ */}
      <div className="ob-role__hero" aria-hidden="true">
        <div className="ob-role__orb ob-role__orb--1" />
        <div className="ob-role__orb ob-role__orb--2" />
        <div className="ob-role__orb ob-role__orb--3" />

        <div className="ob-role__hero-inner">
          {/* Brand */}
          <div className="ob-role__brand">
            <div className="ob-role__brand-icon">
              <Gavel size={21} strokeWidth={2.2} />
            </div>
            <span className="ob-role__brand-name">BidZone</span>
          </div>

          {/* Pill */}
          <div className="ob-role__step-pill">
            <Star size={10} strokeWidth={2.5} />
            Free forever · No credit card
          </div>

          <h1 className="ob-role__headline">
            Join the<br />
            Auction{' '}
            <span className="ob-role__headline-accent">Revolution.</span>
          </h1>

          <p className="ob-role__hero-sub">
            Sign up in 30 seconds. Start bidding immediately.
            Upgrade to seller whenever you&apos;re ready.
          </p>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.25rem' }}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
                  display: 'grid', placeItems: 'center', color: 'var(--bz-gold)',
                }}>
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="ob-role__stats">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <span className="ob-role__stat-val">{value}</span>
                <span className="ob-role__stat-lbl">{label}</span>
              </div>
            ))}
          </div>

          {/* Trust */}
          <div className="ob-role__trust">
            <ShieldCheck size={12} strokeWidth={2.5} />
            <span>SSL Secured</span>
            <span className="ob-role__trust-sep" aria-hidden />
            <span>No spam</span>
            <span className="ob-role__trust-sep" aria-hidden />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT FORM PANEL
          ════════════════════════════════ */}
      <div className="ob-role__panel">
        <div className="ob-role__panel-inner">

          {/* Toolbar */}
          <div className="ob-role__toolbar">
            <LanguageSwitcher />
            <button
              type="button"
              className="ob-role__help-btn"
              aria-label={t('common.help')}
              onClick={openHelp}
            >
              <HelpCircle size={17} />
            </button>
          </div>

          {/* Mobile brand */}
          <div className="ob-role__mobile-brand" aria-hidden="true">
            <div className="ob-role__brand-icon">
              <Gavel size={19} strokeWidth={2.2} />
            </div>
            <span className="ob-role__brand-name">BidZone</span>
          </div>

          <h2 className="ob-role__panel-heading">Create your account</h2>
          <p className="ob-role__panel-sub">
            Already have an account?{' '}
            <Link href="/" style={{ color: 'var(--bz-gold)', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>

          {/* Google — primary CTA */}
          <div className="lp__google-section" style={{ marginBottom: '1.25rem' }}>
            <GoogleSignInButton />
          </div>

          {/* Divider */}
          <div className="lp__divider" style={{ marginBottom: '1.25rem' }}>
            <span>or sign up with email</span>
          </div>

          {/* Form */}
          <form className="ob-form" onSubmit={onSubmit} noValidate>

            {/* Full name */}
            <label className="ob-field">
              <span className="ob-label">Full name</span>
              <div className="ob-input-wrap">
                <span className="ob-input-icon"><User size={17} /></span>
                <input
                  ref={nameRef}
                  className="ob-input"
                  type="text"
                  required
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </label>

            {/* Email */}
            <label className="ob-field">
              <span className="ob-label">Email address</span>
              <div className="ob-input-wrap">
                <span className="ob-input-icon"><Mail size={17} /></span>
                <input
                  className="ob-input"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </label>

            {/* Password */}
            <label className="ob-field">
              <span className="ob-label">Password</span>
              <div className="ob-input-wrap">
                <span className="ob-input-icon"><Lock size={17} /></span>
                <input
                  className="ob-input ob-input--pad-right"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="ob-eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {/* Error */}
            {error && (
              <p role="alert" className="ob-alert">
                <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </p>
            )}

            {/* Submit */}
            <button type="submit" className="ob-btn" disabled={loading}>
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(3,7,18,0.3)',
                    borderTopColor: '#030712', borderRadius: '50%',
                    animation: 'ob-spin 0.7s linear infinite', flexShrink: 0,
                  }} />
                  Creating account…
                </>
              ) : (
                <>
                  Create free account
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Terms */}
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--bz-text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <a href="#terms" style={{ color: 'var(--bz-text-muted)', textDecoration: 'underline' }}>Terms</a>
              {' '}and{' '}
              <a href="#privacy" style={{ color: 'var(--bz-text-muted)', textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>

          </form>

          {/* Seller note */}
          <div style={{
            marginTop: '1.5rem', padding: '0.7rem 0.9rem', borderRadius: 12,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            fontSize: '0.82rem', color: 'var(--bz-text-muted)', lineHeight: 1.45,
          }}>
            <Store size={15} style={{ flexShrink: 0, color: 'var(--bz-gold)' }} />
            <span>
              Want to sell?{' '}
              <span style={{ color: 'var(--bz-text-body)' }}>
                Sign up as a bidder first — you can upgrade to seller instantly from your profile.
              </span>
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
