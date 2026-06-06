'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Gavel,
  Search,
  LogOut,
  Home,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Activity,
  UserPlus,
  AlertTriangle,
  Lock,
  Crown,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/apiClient'
import { AdminAdminsPanel } from '@/components/admin/AdminAdminsPanel'
import { AdminBannersPanel } from '@/components/admin/AdminBannersPanel'
import { AdminListingsPanel } from '@/components/admin/AdminListingsPanel'
import type { AdminStatsResponse, AdminTab, AdminUserRow } from '@/types/admin'

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function KycBadge({ status }: { status: string }) {
  const cls =
    status === 'verified'
      ? 'adm-badge adm-badge--ok'
      : status === 'pending'
        ? 'adm-badge adm-badge--warn'
        : status === 'rejected'
          ? 'adm-badge adm-badge--err'
          : 'adm-badge adm-badge--muted'
  return <span className={cls}>{status.replace('_', ' ')}</span>
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'admin'
      ? 'adm-badge adm-badge--admin'
      : role === 'seller'
        ? 'adm-badge adm-badge--seller'
        : 'adm-badge adm-badge--muted'
  return <span className={cls}>{role}</span>
}

const NAV: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'kyc', label: 'Seller Verification', icon: ShieldCheck },
  { id: 'auctions', label: 'Listings', icon: Gavel },
  { id: 'banners', label: 'Promotions', icon: Megaphone },
  { id: 'admins', label: 'Administrators', icon: Crown },
]

export function AdminDashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statsData, setStatsData] = useState<AdminStatsResponse | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    const data = await api.get<AdminStatsResponse>('/admin/stats')
    setStatsData(data)
  }, [])

  const loadUsers = useCallback(async (params?: { kycStatus?: string; q?: string }) => {
    const qs = new URLSearchParams()
    if (params?.kycStatus) qs.set('kycStatus', params.kycStatus)
    if (params?.q) qs.set('q', params.q)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const data = await api.get<{ users: AdminUserRow[] }>(`/admin/users${suffix}`)
    setUsers(data.users)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await loadStats()
      if (tab === 'users') await loadUsers({ q: userQuery || undefined })
      if (tab === 'kyc') await loadUsers({ kycStatus: 'pending' })
    } catch {
      setError('Failed to load admin data. Check your connection and permissions.')
    } finally {
      setLoading(false)
    }
  }, [tab, userQuery, loadStats, loadUsers])

  useEffect(() => {
    void refresh()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function patchUser(id: string, body: Record<string, unknown>) {
    setActionId(id)
    try {
      await api.patch(`/admin/users/${id}`, body)
      await refresh()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setActionId(null)
    }
  }

  function handleSignOut() {
    logout()
    router.push('/')
  }

  const pendingCount = statsData?.stats.pendingKyc ?? 0
  const pendingListingsCount = statsData?.stats.pendingListings ?? 0

  return (
    <div className="adm">
      <aside className="adm__sidebar">
        <div className="adm__brand">
          <div className="adm__brand-mark">BZ</div>
          <div>
            <span className="adm__brand-name">BidZone</span>
            <span className="adm__brand-sub">Admin Console</span>
          </div>
        </div>

        <nav className="adm__nav" aria-label="Admin navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`adm__nav-item${tab === id ? ' adm__nav-item--active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
              {id === 'kyc' && pendingCount > 0 && (
                <span className="adm__nav-badge">{pendingCount}</span>
              )}
              {id === 'auctions' && pendingListingsCount > 0 && (
                <span className="adm__nav-badge">{pendingListingsCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="adm__sidebar-foot">
          <div className="adm__admin-card">
            <div className="adm__admin-avatar">
              {(user?.fullName ?? 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="adm__admin-meta">
              <span className="adm__admin-name">{user?.fullName}</span>
              <span className="adm__admin-email">{user?.email}</span>
            </div>
          </div>
          <Link href="/home" className="adm__foot-link">
            <Home size={16} /> Marketplace
          </Link>
          <button type="button" className="adm__foot-link adm__foot-link--danger" onClick={handleSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="adm__main">
        <header className="adm__topbar">
          <div>
            <h1 className="adm__title">{NAV.find((n) => n.id === tab)?.label}</h1>
            <p className="adm__subtitle">Platform management &amp; moderation</p>
          </div>
          <button type="button" className="adm__refresh" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'adm__spin' : ''} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="adm__alert" role="alert">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading && !statsData ? (
          <div className="adm__loading">
            <div className="adm__loading-ring" aria-hidden />
            <p>Loading admin data…</p>
          </div>
        ) : (
          <>
            {tab === 'overview' && statsData && (
              <div className="adm__panel">
                <div className="adm__kpi-grid">
                  <div className="adm__kpi adm__kpi--gold">
                    <Users size={22} />
                    <div>
                      <span className="adm__kpi-val">{statsData.stats.totalUsers}</span>
                      <span className="adm__kpi-lbl">Total users</span>
                    </div>
                    <span className="adm__kpi-delta">
                      <UserPlus size={14} /> +{statsData.stats.newUsersWeek} this week
                    </span>
                  </div>
                  <div className="adm__kpi">
                    <ShieldCheck size={22} />
                    <div>
                      <span className="adm__kpi-val">{statsData.stats.pendingKyc}</span>
                      <span className="adm__kpi-lbl">Pending sellers</span>
                    </div>
                  </div>
                  <div className="adm__kpi">
                    <Gavel size={22} />
                    <div>
                      <span className="adm__kpi-val">{statsData.stats.activeAuctions}</span>
                      <span className="adm__kpi-lbl">Active auctions</span>
                    </div>
                  </div>
                  <div className="adm__kpi">
                    <Activity size={22} />
                    <div>
                      <span className="adm__kpi-val">{statsData.stats.bidsToday}</span>
                      <span className="adm__kpi-lbl">Bids today</span>
                    </div>
                  </div>
                </div>

                <div className="adm__split">
                  <section className="adm__card">
                    <div className="adm__card-head">
                      <h2><TrendingUp size={18} /> Platform snapshot</h2>
                    </div>
                    <ul className="adm__stat-list">
                      <li><span>Bidders</span><strong>{statsData.stats.bidders}</strong></li>
                      <li><span>Sellers</span><strong>{statsData.stats.sellers}</strong></li>
                      <li><span>Administrators</span><strong>{statsData.stats.admins}</strong></li>
                      <li><span>Total listings</span><strong>{statsData.stats.totalAuctions}</strong></li>
                      <li><span>Total bids</span><strong>{statsData.stats.totalBids}</strong></li>
                      <li><span>Rejected verifications</span><strong>{statsData.stats.rejectedKyc}</strong></li>
                    </ul>
                  </section>

                  <section className="adm__card">
                    <div className="adm__card-head">
                      <h2><Lock size={18} /> Security model</h2>
                    </div>
                    <ul className="adm__security-list">
                      <li>Admin access is controlled by the <code>ADMIN_EMAILS</code> environment allowlist — never hardcoded in source.</li>
                      <li>Every admin API validates JWT, database role, and allowlist (defense in depth).</li>
                      <li>Main admins (<code>ADMIN_EMAILS</code>) cannot be demoted; delegated admins can be managed in Administrators.</li>
                      <li>Users cannot self-promote to admin or self-verify KYC privileges.</li>
                      <li>Admin accounts cannot be modified from this panel.</li>
                    </ul>
                  </section>
                </div>

                <div className="adm__split">
                  <section className="adm__card">
                    <div className="adm__card-head">
                      <h2>Recent sign-ups</h2>
                    </div>
                    <div className="adm__table-wrap">
                      <table className="adm__table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Verification</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData.recentUsers.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <span className="adm__cell-main">{u.fullName}</span>
                                <span className="adm__cell-sub">{u.email}</span>
                              </td>
                              <td><RoleBadge role={u.role} /></td>
                              <td><KycBadge status={u.kycStatus} /></td>
                              <td>{formatDate(u.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="adm__card">
                    <div className="adm__card-head">
                      <h2>Recent listings</h2>
                    </div>
                    <div className="adm__table-wrap">
                      <table className="adm__table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Bid</th>
                            <th>Seller</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData.recentAuctions.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <span className="adm__cell-main">{a.title}</span>
                                {a.featured && <span className="adm__featured-tag">Featured</span>}
                              </td>
                              <td>{formatMoney(a.currentBid)}</td>
                              <td>{a.sellerName ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="adm__panel">
                <div className="adm__toolbar">
                  <div className="adm__search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search by name or email…"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void loadUsers({ q: userQuery || undefined })}
                    />
                  </div>
                  <button type="button" className="adm__btn adm__btn--ghost" onClick={() => void loadUsers({ q: userQuery || undefined })}>
                    Search
                  </button>
                </div>
                <div className="adm__card adm__card--flush">
                  <div className="adm__table-wrap">
                    <table className="adm__table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Verification</th>
                          <th>Listing</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <span className="adm__cell-main">{u.fullName}</span>
                              <span className="adm__cell-sub">{u.email}</span>
                            </td>
                            <td><RoleBadge role={u.role} /></td>
                            <td><KycBadge status={u.kycStatus} /></td>
                            <td>{u.listingAllowed ? 'Allowed' : 'Blocked'}</td>
                            <td>{formatDate(u.createdAt)}</td>
                            <td>
                              {u.role !== 'admin' && (
                                <div className="adm__row-actions">
                                  {u.kycStatus === 'pending' && (
                                    <>
                                      <button
                                        type="button"
                                        className="adm__icon-btn adm__icon-btn--ok"
                                        title="Approve seller"
                                        disabled={actionId === u.id}
                                        onClick={() => void patchUser(u.id, { kycStatus: 'verified' })}
                                      >
                                        <CheckCircle2 size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        className="adm__icon-btn adm__icon-btn--err"
                                        title="Reject seller"
                                        disabled={actionId === u.id}
                                        onClick={() => void patchUser(u.id, { kycStatus: 'rejected' })}
                                      >
                                        <XCircle size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'kyc' && (
              <div className="adm__panel">
                <p className="adm__hint">
                  When someone applies to become a seller, they appear here for identity review.
                  Approve to let them list items on the marketplace; reject if verification fails.
                </p>
                <div className="adm__card adm__card--flush">
                  {users.length === 0 ? (
                    <div className="adm__empty">
                      <ShieldCheck size={40} strokeWidth={1.25} />
                      <p>No sellers awaiting verification</p>
                    </div>
                  ) : (
                    <div className="adm__kyc-list">
                      {users.map((u) => (
                        <article key={u.id} className="adm__kyc-card">
                          <div className="adm__kyc-info">
                            <h3>{u.fullName}</h3>
                            <p>{u.email}</p>
                            <div className="adm__kyc-meta">
                              <span>Phone: {u.phone || '—'}</span>
                              <span>City: {u.city || '—'}</span>
                              <KycBadge status={u.kycStatus} />
                            </div>
                          </div>
                          <div className="adm__kyc-actions">
                            <button
                              type="button"
                              className="adm__btn adm__btn--ok"
                              disabled={actionId === u.id}
                              onClick={() => void patchUser(u.id, { kycStatus: 'verified' })}
                            >
                              <CheckCircle2 size={16} /> Approve
                            </button>
                            <button
                              type="button"
                              className="adm__btn adm__btn--err"
                              disabled={actionId === u.id}
                              onClick={() => void patchUser(u.id, { kycStatus: 'rejected' })}
                            >
                              <XCircle size={16} /> Reject
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'auctions' && (
              <AdminListingsPanel
                onError={setError}
                actionId={actionId}
                setActionId={setActionId}
              />
            )}

            {tab === 'admins' && (
              <AdminAdminsPanel
                onError={setError}
                actionId={actionId}
                setActionId={setActionId}
              />
            )}

            {tab === 'banners' && (
              <AdminBannersPanel
                onError={setError}
                actionId={actionId}
                setActionId={setActionId}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
