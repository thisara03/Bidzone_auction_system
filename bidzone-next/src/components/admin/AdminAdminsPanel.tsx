'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Shield, UserMinus, UserPlus, Search } from 'lucide-react'
import { api } from '@/lib/apiClient'
import type { AdminUserRow } from '@/types/admin'

type AdminAccount = AdminUserRow & {
  isSuperAdmin: boolean
  delegatedAdmin: boolean
  adminType: 'super' | 'delegated' | null
}

type Props = {
  onError: (msg: string) => void
  actionId: string | null
  setActionId: (id: string | null) => void
}

function AdminTypeBadge({ type }: { type: AdminAccount['adminType'] }) {
  if (type === 'super') {
    return (
      <span className="adm-badge adm-badge--super">
        <Crown size={10} /> Main admin
      </span>
    )
  }
  if (type === 'delegated') {
    return (
      <span className="adm-badge adm-badge--admin">
        <Shield size={10} /> Delegated
      </span>
    )
  }
  return null
}

export function AdminAdminsPanel({ onError, actionId, setActionId }: Props) {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [candidates, setCandidates] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [adminRes, userRes] = await Promise.all([
        api.get<{ admins: AdminAccount[] }>('/admin/admins'),
        api.get<{ users: AdminUserRow[] }>('/admin/users'),
      ])
      setAdmins(adminRes.admins)
      setCandidates(userRes.users.filter((u) => u.role !== 'admin'))
    } catch {
      onError('Failed to load admin accounts.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void load()
  }, [load])

  async function promote(userId: string) {
    setActionId(userId)
    try {
      await api.post('/admin/admins', { userId })
      await load()
    } catch {
      onError('Could not promote user to admin.')
    } finally {
      setActionId(null)
    }
  }

  async function demote(userId: string) {
    if (!window.confirm('Remove admin privileges from this user?')) return
    setActionId(userId)
    try {
      await api.delete(`/admin/admins/${userId}`)
      await load()
    } catch {
      onError('Could not demote admin. Main admins are protected.')
    } finally {
      setActionId(null)
    }
  }

  const filteredCandidates = candidates.filter((u) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="adm__loading">
        <div className="adm__loading-ring" aria-hidden />
        <p>Loading administrators…</p>
      </div>
    )
  }

  return (
    <div className="adm__panel">
      <p className="adm__hint">
        Main admins are defined in <code>ADMIN_EMAILS</code> and cannot be removed here. You can
        promote existing users to delegated admin — they gain console access but cannot demote main
        admins. Promoted users must sign in again to receive admin access.
      </p>

      <section className="adm__card">
        <div className="adm__card-head">
          <h2>Current administrators</h2>
        </div>
        <div className="adm__table-wrap">
          <table className="adm__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="adm__cell-main">{a.fullName}</span>
                    <span className="adm__cell-sub">{a.email}</span>
                  </td>
                  <td>
                    <AdminTypeBadge type={a.adminType} />
                  </td>
                  <td>
                    {a.adminType === 'delegated' ? (
                      <button
                        type="button"
                        className="adm__btn adm__btn--err adm__btn--sm"
                        disabled={actionId === a.id}
                        onClick={() => void demote(a.id)}
                      >
                        <UserMinus size={14} /> Remove admin
                      </button>
                    ) : (
                      <span className="adm__protected-label">
                        <Crown size={14} /> Protected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm__card">
        <div className="adm__card-head">
          <h2>Promote user to admin</h2>
        </div>
        <div className="adm__toolbar adm__toolbar--stack">
          <div className="adm__search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search users to promote…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="adm__promote-list">
          {filteredCandidates.length === 0 ? (
            <p className="adm__empty-inline">No eligible users found.</p>
          ) : (
            filteredCandidates.slice(0, 12).map((u) => (
              <div key={u.id} className="adm__promote-row">
                <div>
                  <span className="adm__cell-main">{u.fullName}</span>
                  <span className="adm__cell-sub">{u.email}</span>
                </div>
                <button
                  type="button"
                  className="adm__btn adm__btn--ok adm__btn--sm"
                  disabled={actionId === u.id}
                  onClick={() => void promote(u.id)}
                >
                  <UserPlus size={14} /> Make admin
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
