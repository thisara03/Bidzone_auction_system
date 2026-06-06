'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2, Pencil, Pause, Play } from 'lucide-react'
import { api } from '@/lib/apiClient'
import { BANNER_PLACEMENT_LABELS } from '@/lib/banners'
import type { AdminBannerRow, BannerFormState } from '@/types/admin'

type Props = {
  onError: (msg: string) => void
  actionId: string | null
  setActionId: (id: string | null) => void
}

const EMPTY_FORM: BannerFormState = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  placement: 'left_primary',
  status: 'draft',
  startsAt: '',
  endsAt: '',
  priority: 0,
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function DisplayStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'live'
      ? 'adm-badge adm-badge--ok'
      : status === 'scheduled'
        ? 'adm-badge adm-badge--info'
        : status === 'expired'
          ? 'adm-badge adm-badge--muted'
          : status === 'paused'
            ? 'adm-badge adm-badge--warn'
            : 'adm-badge adm-badge--muted'
  return <span className={cls}>{status}</span>
}

function BannerForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
  busy,
}: {
  form: BannerFormState
  setForm: (f: BannerFormState) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  busy: boolean
}) {
  return (
    <div className="adm__banner-form">
      <div className="adm__form-grid">
        <label className="adm__field">
          <span>Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Summer auction promo"
          />
        </label>
        <label className="adm__field">
          <span>Subtitle</span>
          <input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Optional tagline"
          />
        </label>
        <label className="adm__field adm__field--full">
          <span>Image URL</span>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://…"
          />
        </label>
        <label className="adm__field adm__field--full">
          <span>Link URL (optional)</span>
          <input
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            placeholder="https://…"
          />
        </label>
        <label className="adm__field">
          <span>Placement</span>
          <select
            value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value as BannerFormState['placement'] })}
          >
            {Object.entries(BANNER_PLACEMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="adm__field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as BannerFormState['status'] })}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="adm__field">
          <span>Visible from</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </label>
        <label className="adm__field">
          <span>Visible until</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </label>
        <label className="adm__field">
          <span>Priority</span>
          <input
            type="number"
            min={0}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      <div className="adm__form-actions">
        {onCancel && (
          <button type="button" className="adm__btn adm__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="adm__btn adm__btn--gold" disabled={busy} onClick={onSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

export function AdminBannersPanel({ onError, actionId, setActionId }: Props) {
  const [banners, setBanners] = useState<AdminBannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<BannerFormState>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BannerFormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ banners: AdminBannerRow[] }>('/admin/banners')
      setBanners(data.banners)
    } catch {
      onError('Failed to load promotion banners.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void load()
  }, [load])

  function defaultDates(): Pick<BannerFormState, 'startsAt' | 'endsAt'> {
    const start = new Date()
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
    return { startsAt: toLocalInput(start.toISOString()), endsAt: toLocalInput(end.toISOString()) }
  }

  async function createBanner() {
    setActionId('create')
    try {
      await api.post('/admin/banners', {
        ...createForm,
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: new Date(createForm.endsAt).toISOString(),
      })
      setShowCreate(false)
      setCreateForm({ ...EMPTY_FORM, ...defaultDates() })
      await load()
    } catch {
      onError('Could not create banner. Check all fields and date range.')
    } finally {
      setActionId(null)
    }
  }

  async function updateBanner(id: string) {
    setActionId(id)
    try {
      await api.patch(`/admin/banners/${id}`, {
        ...editForm,
        startsAt: new Date(editForm.startsAt).toISOString(),
        endsAt: new Date(editForm.endsAt).toISOString(),
      })
      setEditId(null)
      await load()
    } catch {
      onError('Could not update banner.')
    } finally {
      setActionId(null)
    }
  }

  async function togglePause(banner: AdminBannerRow) {
    setActionId(banner.id)
    try {
      await api.patch(`/admin/banners/${banner.id}`, {
        status: banner.status === 'paused' ? 'active' : 'paused',
      })
      await load()
    } catch {
      onError('Could not update banner status.')
    } finally {
      setActionId(null)
    }
  }

  async function deleteBanner(id: string) {
    if (!window.confirm('Delete this banner permanently?')) return
    setActionId(id)
    try {
      await api.delete(`/admin/banners/${id}`)
      await load()
    } catch {
      onError('Could not delete banner.')
    } finally {
      setActionId(null)
    }
  }

  function startEdit(banner: AdminBannerRow) {
    setEditId(banner.id)
    setEditForm({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      placement: banner.placement,
      status: banner.status,
      startsAt: toLocalInput(banner.startsAt),
      endsAt: toLocalInput(banner.endsAt),
      priority: banner.priority,
    })
  }

  if (loading) {
    return (
      <div className="adm__loading">
        <div className="adm__loading-ring" aria-hidden />
        <p>Loading banners…</p>
      </div>
    )
  }

  return (
    <div className="adm__panel">
      <div className="adm__toolbar">
        <p className="adm__hint adm__hint--inline">
          Manage marketplace ad rails. Banners show only when status is <strong>Active</strong> and
          the current time is within the scheduled window.
        </p>
        <button
          type="button"
          className="adm__btn adm__btn--gold"
          onClick={() => {
            setShowCreate((v) => !v)
            setCreateForm({ ...EMPTY_FORM, ...defaultDates() })
          }}
        >
          <Plus size={16} /> New banner
        </button>
      </div>

      {showCreate && (
        <section className="adm__card">
          <div className="adm__card-head">
            <h2>
              <Megaphone size={18} /> Create promotion banner
            </h2>
          </div>
          <BannerForm
            form={createForm}
            setForm={setCreateForm}
            onSubmit={() => void createBanner()}
            onCancel={() => setShowCreate(false)}
            submitLabel="Create banner"
            busy={actionId === 'create'}
          />
        </section>
      )}

      <section className="adm__card adm__card--flush">
        <div className="adm__table-wrap">
          <table className="adm__table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Placement</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="adm__empty-cell">
                    No banners yet — create one to fill the marketplace ad rails.
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="adm__listing-cell">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.imageUrl} alt="" className="adm__listing-thumb" />
                        <div>
                          <span className="adm__cell-main">{b.title}</span>
                          {b.subtitle && <span className="adm__cell-sub">{b.subtitle}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{BANNER_PLACEMENT_LABELS[b.placement] ?? b.placement}</td>
                    <td>
                      <span className="adm__cell-sub">
                        {new Date(b.startsAt).toLocaleString()} →{' '}
                        {new Date(b.endsAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <DisplayStatusBadge status={b.displayStatus} />
                      <span className="adm__cell-sub">Setting: {b.status}</span>
                    </td>
                    <td>
                      {editId === b.id ? null : (
                        <div className="adm__row-actions">
                          <button
                            type="button"
                            className="adm__icon-btn"
                            title="Edit"
                            disabled={actionId === b.id}
                            onClick={() => startEdit(b)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="adm__icon-btn"
                            title={b.status === 'paused' ? 'Resume' : 'Pause'}
                            disabled={actionId === b.id}
                            onClick={() => void togglePause(b)}
                          >
                            {b.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                          </button>
                          <button
                            type="button"
                            className="adm__icon-btn adm__icon-btn--err"
                            title="Delete"
                            disabled={actionId === b.id}
                            onClick={() => void deleteBanner(b.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editId && (
        <section className="adm__card">
          <div className="adm__card-head">
            <h2>Edit banner</h2>
          </div>
          <BannerForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={() => void updateBanner(editId)}
            onCancel={() => setEditId(null)}
            submitLabel="Save changes"
            busy={actionId === editId}
          />
        </section>
      )}
    </div>
  )
}
