'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken } from '@/lib/apiClient'

type WishlistContextValue = {
  ids: string[]
  count: number
  has: (id: string) => boolean
  toggle: (id: string) => void
  remove: (id: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api
      .get<{ ids: string[] }>('/wishlist')
      .then(({ ids: loaded }) => setIds(loaded))
      .catch(() => {/* silent */})
  }, [])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
    api
      .post<{ ids: string[] }>('/wishlist', { auctionId: id })
      .then(({ ids: updated }) => setIds(updated))
      .catch(() => {/* optimistic update stays */})
  }, [])

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id))
    api
      .delete<{ ids: string[] }>('/wishlist', { auctionId: id })
      .then(({ ids: updated }) => setIds(updated))
      .catch(() => {/* optimistic update stays */})
  }, [])

  const value = useMemo(
    () => ({ ids, count: ids.length, has, toggle, remove }),
    [ids, has, toggle, remove],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
