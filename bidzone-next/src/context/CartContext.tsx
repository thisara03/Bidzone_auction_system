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

type CartContextValue = {
  ids: string[]
  count: number
  has: (id: string) => boolean
  add: (id: string) => void
  remove: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api
      .get<{ ids: string[] }>('/cart')
      .then(({ ids: loaded }) => setIds(loaded))
      .catch(() => {/* silent */})
  }, [])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  const add = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
    api
      .post<{ ids: string[] }>('/cart', { auctionId: id })
      .then(({ ids: updated }) => setIds(updated))
      .catch(() => {/* optimistic update stays */})
  }, [])

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id))
    api
      .delete<{ ids: string[] }>('/cart', { auctionId: id })
      .then(({ ids: updated }) => setIds(updated))
      .catch(() => {/* optimistic update stays */})
  }, [])

  const clear = useCallback(() => {
    setIds([])
    api
      .delete<{ ids: string[] }>('/cart', { clear: true })
      .then(({ ids: updated }) => setIds(updated))
      .catch(() => {/* optimistic update stays */})
  }, [])

  const value = useMemo(
    () => ({ ids, count: ids.length, has, add, remove, clear }),
    [ids, has, add, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
