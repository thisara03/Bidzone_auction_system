'use client'
import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, DollarSign, Package, Eye, BarChart3, TrendingUp, HelpCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useListings } from '@/context/ListingsContext'
import { useI18n } from '@/context/I18nContext'
import { useHelp } from '@/context/HelpContext'
import type { AuctionItem } from '@/data/auctions'
import { displayAuctionEndLocal } from '@/lib/auctionTime'

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function viewsForItem(item: AuctionItem): number {
  return 80 + (hashId(item.id) % 520)
}

function isEndingToday(iso: string): boolean {
  const end = new Date(iso)
  if (end.getTime() <= Date.now()) return false
  const today = new Date()
  return (
    end.getFullYear() === today.getFullYear() &&
    end.getMonth() === today.getMonth() &&
    end.getDate() === today.getDate()
  )
}

function ListingStatusBadge({ status, t }: { status?: AuctionItem['moderationStatus']; t: (k: string) => string }) {
  if (status === 'approved') {
    return (
      <span className="seller-dash__status seller-dash__status--approved">
        <CheckCircle2 size={14} aria-hidden />
        {t('seller.statusApproved')}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="seller-dash__status seller-dash__status--rejected">
        <XCircle size={14} aria-hidden />
        {t('seller.statusRejected')}
      </span>
    )
  }
  return (
    <span className="seller-dash__status seller-dash__status--pending">
      <Clock size={14} aria-hidden />
      {t('seller.statusPending')}
    </span>
  )
}

function RevenueAreaChart({ values }: { values: number[] }) {
  const w = 520, h = 200, padL = 44, padR = 16, padT = 16, padB = 32
  const iw = w - padL - padR, ih = h - padT - padB
  const maxV = Math.max(...values, 3400) * 1.02, minV = 0
  const n = values.length
  const pts = values.map((v, i) => ({
    x: padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw),
    y: padT + ih - ((v - minV) / (maxV - minV)) * ih,
  }))
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${lineD} L ${(padL + iw).toFixed(1)} ${(padT + ih).toFixed(1)} L ${padL.toFixed(1)} ${(padT + ih).toFixed(1)} Z`
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + (maxV - minV) * t)
  return (
    <svg className="seller-dash__chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {yTicks.map((yv, i) => {
        const y = padT + ih - ((yv - minV) / (maxV - minV)) * ih
        return (
          <g key={i}>
            <line x1={padL} x2={padL + iw} y1={y} y2={y} className="seller-dash__chart-grid" />
            <text x={4} y={y + 4} className="seller-dash__chart-y-label">{Math.round(yv).toLocaleString()}</text>
          </g>
        )
      })}
      <path d={areaD} className="seller-dash__chart-area" />
      <path d={lineD} className="seller-dash__chart-line" fill="none" />
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((lab, i) => (
        <text key={lab} x={padL + (i / 6) * iw} y={h - 6} textAnchor="middle" className="seller-dash__chart-x-label">{lab}</text>
      ))}
    </svg>
  )
}

type DonutSeg = { pct: number; color: string; labelKey: string }

function DonutBlock({ segments, t }: { segments: DonutSeg[]; t: (k: string) => string }) {
  let acc = 0
  const parts = segments.filter((s) => s.pct > 0).map((s) => {
    const start = acc; acc += s.pct; return { ...s, start }
  })
  const gradient = parts.map((p) => {
    const a = (p.start / 100) * 360, b = ((p.start + p.pct) / 100) * 360
    return `${p.color} ${a}deg ${b}deg`
  }).join(', ')
  return (
    <div className="seller-dash__donut-wrap">
      <div className="seller-dash__donut" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={t('seller.chartCategoryTitle')} />
      <ul className="seller-dash__donut-legend">
        {parts.map((p) => (
          <li key={p.labelKey}>
            <span className="seller-dash__dot" style={{ background: p.color }} aria-hidden />
            <span>{t(p.labelKey)}</span>
            <strong>{p.pct}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function bucketCategory(list: AuctionItem[]) {
  let electronics = 0, fashion = 0, collectibles = 0, other = 0
  for (const i of list) {
    const c = i.category.toLowerCase()
    if (c.includes('electron') || c.includes('computer') || c.includes('laptop')) electronics++
    else if (c.includes('fashion') || c.includes('jewelry') || c.includes('watch')) fashion++
    else if (c.includes('collect') || c.includes('sport') || c.includes('art')) collectibles++
    else other++
  }
  const total = electronics + fashion + collectibles + other
  if (total === 0) {
    return [
      { pct: 45, color: '#3b82f6', labelKey: 'seller.legendElectronics' },
      { pct: 25, color: '#8b5cf6', labelKey: 'seller.legendFashion' },
      { pct: 20, color: '#10b981', labelKey: 'seller.legendCollectibles' },
      { pct: 10, color: '#f97316', labelKey: 'seller.legendOther' },
    ] as DonutSeg[]
  }
  const pct = (n: number) => Math.round((n / total) * 100)
  const segs: DonutSeg[] = [
    { pct: pct(electronics), color: '#3b82f6', labelKey: 'seller.legendElectronics' },
    { pct: pct(fashion), color: '#8b5cf6', labelKey: 'seller.legendFashion' },
    { pct: pct(collectibles), color: '#10b981', labelKey: 'seller.legendCollectibles' },
    { pct: pct(other), color: '#f97316', labelKey: 'seller.legendOther' },
  ]
  const sum = segs.reduce((s, x) => s + x.pct, 0)
  if (sum !== 100 && segs.length) segs[segs.length - 1].pct += 100 - sum
  return segs
}

export function SellerDashboardPage() {
  const { userListings } = useListings()
  const { t } = useI18n()
  const { openHelp } = useHelp()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showPendingBanner, setShowPendingBanner] = useState(false)

  useEffect(() => {
    if (searchParams.get('listing') === 'pending') {
      setShowPendingBanner(true)
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router])

  const approvedListings = useMemo(
    () => userListings.filter((x) => x.moderationStatus === 'approved'),
    [userListings],
  )

  const metrics = useMemo(() => {
    const hasReal = approvedListings.length > 0
    const revenue = approvedListings.reduce((s, x) => s + x.currentBid, 0)
    const views = approvedListings.reduce((s, x) => s + viewsForItem(x), 0)
    const endingToday = approvedListings.filter((x) => {
      if (x.auctionEndsAt) return isEndingToday(x.auctionEndsAt)
      return /^\d+h\b/.test(x.timeLeft.trim())
    }).length
    const sold = Math.max(0, Math.floor(approvedListings.length * 2.4))
    return {
      activeKpi: approvedListings.length,
      revenue: hasReal ? revenue : 0,
      views: hasReal ? views : 0,
      sold: hasReal ? sold : 0,
      endingToday,
    }
  }, [approvedListings])

  const revenueSeries = useMemo(() => {
    if (approvedListings.length === 0) return [0, 0, 0, 0, 0, 0, 0]
    const base = metrics.revenue / 7
    const seed = hashId(approvedListings[0]?.id ?? 'x')
    return [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const wobble = 0.75 + ((seed >> (d * 3)) % 50) / 100
      return Math.round(base * (d + 2) * wobble * 0.35 + base * d * 0.15 + 800)
    })
  }, [metrics.revenue, approvedListings])

  const donutSegs = useMemo(() => bucketCategory(approvedListings), [approvedListings])

  const tableRows = useMemo(
    () =>
      userListings.map((item) => ({
        id: item.id,
        title: item.title,
        bid: item.currentBid,
        views: viewsForItem(item),
        bids: item.bids,
        ends: item.auctionEndsAt ? displayAuctionEndLocal(item.auctionEndsAt) : item.timeLeft,
        href: `/listing/${item.id}`,
        status: item.moderationStatus,
      })),
    [userListings],
  )

  return (
    <div className="seller-dash">
      <header className="seller-dash__hero">
        <div className="seller-dash__hero-inner">
          <div className="seller-dash__hero-top">
            <Link href="/home" className="seller-dash__back">
              <ArrowLeft size={18} aria-hidden />
              {t('seller.backAuctions')}
            </Link>
            <div className="seller-dash__hero-actions">
              <div className="seller-dash__lang"><LanguageSwitcher /></div>
              <Link href="/seller/new" className="seller-dash__create">
                <Plus size={20} aria-hidden />
                {t('seller.createListing')}
              </Link>
            </div>
          </div>
          <h1 className="seller-dash__hero-title">{t('seller.dashboardTitle')}</h1>
          <p className="seller-dash__hero-sub">{t('seller.dashboardSubtitle')}</p>
        </div>
      </header>

      <div className="seller-dash__content">
        {showPendingBanner && (
          <div className="seller-dash__pending-banner" role="status">
            <Clock size={20} aria-hidden />
            <div>
              <strong>{t('seller.pendingBannerTitle')}</strong>
              <p>{t('seller.pendingBannerBody')}</p>
            </div>
            <button type="button" className="seller-dash__pending-dismiss" onClick={() => setShowPendingBanner(false)}>
              {t('seller.pendingBannerDismiss')}
            </button>
          </div>
        )}

        <div className="seller-dash__kpis">
          <article className="seller-dash__kpi">
            <DollarSign className="seller-dash__kpi-icon" size={22} aria-hidden />
            <p className="seller-dash__kpi-label">{t('seller.kpiTotalRevenue')}</p>
            <p className="seller-dash__kpi-value">{formatMoney(metrics.revenue)}</p>
            <p className="seller-dash__kpi-foot seller-dash__kpi-foot--green">
              <TrendingUp size={14} aria-hidden /> {t('seller.kpiRevenueTrend')}
            </p>
          </article>
          <article className="seller-dash__kpi">
            <Package className="seller-dash__kpi-icon seller-dash__kpi-icon--blue" size={22} aria-hidden />
            <p className="seller-dash__kpi-label">{t('seller.kpiActiveListings')}</p>
            <p className="seller-dash__kpi-value">{metrics.activeKpi}</p>
            <p className="seller-dash__kpi-foot">{t('seller.kpiEndingToday', { n: metrics.endingToday })}</p>
          </article>
          <article className="seller-dash__kpi">
            <Eye className="seller-dash__kpi-icon seller-dash__kpi-icon--purple" size={22} aria-hidden />
            <p className="seller-dash__kpi-label">{t('seller.kpiTotalViews')}</p>
            <p className="seller-dash__kpi-value">{metrics.views.toLocaleString()}</p>
            <p className="seller-dash__kpi-foot seller-dash__kpi-foot--purple">
              <TrendingUp size={14} aria-hidden /> {t('seller.kpiViewsTrend')}
            </p>
          </article>
          <article className="seller-dash__kpi">
            <BarChart3 className="seller-dash__kpi-icon seller-dash__kpi-icon--orange" size={22} aria-hidden />
            <p className="seller-dash__kpi-label">{t('seller.kpiSoldItems')}</p>
            <p className="seller-dash__kpi-value">{metrics.sold}</p>
            <p className="seller-dash__kpi-foot">{t('seller.kpiPositiveFeedback')}</p>
          </article>
        </div>

        <div className="seller-dash__charts">
          <section className="seller-dash__chart-card seller-dash__chart-card--wide">
            <h2 className="seller-dash__chart-title">{t('seller.chartRevenueTitle')}</h2>
            <RevenueAreaChart values={revenueSeries} />
          </section>
          <section className="seller-dash__chart-card">
            <h2 className="seller-dash__chart-title">{t('seller.chartCategoryTitle')}</h2>
            <DonutBlock segments={donutSegs} t={t} />
          </section>
        </div>

        <section className="seller-dash__table-card">
          <h2 className="seller-dash__table-title">{t('seller.yourListingsTitle')}</h2>
          {userListings.length === 0 && <p className="seller-dash__table-hint">{t('seller.tableEmpty')}</p>}
          <div className="seller-dash__table-scroll">
            <table className="seller-dash__table">
              <thead>
                <tr>
                  <th>{t('seller.colItem')}</th>
                  <th>{t('seller.colStatus')}</th>
                  <th>{t('seller.colCurrentBid')}</th>
                  <th>{t('seller.colViews')}</th>
                  <th>{t('seller.colBids')}</th>
                  <th>{t('seller.colEndsIn')}</th>
                  <th>{t('seller.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.id}>
                    <td><Link href={row.href} className="seller-dash__item-link">{row.title}</Link></td>
                    <td><ListingStatusBadge status={row.status} t={t} /></td>
                    <td className="seller-dash__bid">{formatMoney(row.bid)}</td>
                    <td>{row.views}</td>
                    <td>{row.bids}</td>
                    <td>{row.ends}</td>
                    <td>
                      <Link href={`/seller/edit/${row.id}`} className="seller-dash__edit">{t('seller.edit')}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <SiteFooter />

      <button type="button" className="seller-dash__help" aria-label={t('common.help')} onClick={openHelp}>
        <HelpCircle size={22} />
      </button>
    </div>
  )
}
