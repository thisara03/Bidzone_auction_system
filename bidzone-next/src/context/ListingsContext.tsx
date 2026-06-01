'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { allAuctions, type AuctionItem } from '@/data/auctions'
import {
  appendBidToUserAuction,
  syncAuctionRecordFromItem,
  type StoredBidHistoryEntry,
} from '@/lib/auctionRecords'
import { getLiveBidState } from '@/lib/liveAuctionBids'
import { api } from '@/lib/apiClient'
import { getToken } from '@/lib/apiClient'

export function mergeCatalog(user: AuctionItem[]): AuctionItem[] {
  return [...user, ...allAuctions.filter((a) => !user.some((u) => u.id === a.id))]
}

function applyLiveBidOverlay(item: AuctionItem): AuctionItem {
  const live = getLiveBidState(item.id)
  if (!live) return item
  return { ...item, currentBid: live.currentBid, bids: live.bids }
}

export type PlaceBidArgs = {
  auctionId: string
  amount: number
  minBid: number
  seedBidHistory: StoredBidHistoryEntry[]
}

type ListingsContextValue = {
  userListings: AuctionItem[]
  addListing: (item: AuctionItem) => Promise<void>
  updateListing: (item: AuctionItem) => Promise<void>
  mergedCatalog: AuctionItem[]
  placeBid: (args: PlaceBidArgs) => Promise<boolean>
}

const ListingsContext = createContext<ListingsContextValue | null>(null)

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [userListings, setUserListings] = useState<AuctionItem[]>([])
  const [liveBidEpoch, setLiveBidEpoch] = useState(0)
  const userListingsRef = useRef(userListings)
  userListingsRef.current = userListings

  useEffect(() => {
    const token = getToken()
    if (!token) return

    api
      .get<{ auctions: AuctionItem[] }>('/auctions')
      .then(({ auctions }) => {
        const userOnly = auctions.filter(
          (a) => !allAuctions.some((s) => s.id === a.id),
        )
        setUserListings(userOnly)
        userOnly.forEach((item) => syncAuctionRecordFromItem(item))
      })
      .catch(() => {
        /* fail silently — catalog still works */
      })
  }, [])

  const addListing = useCallback(async (item: AuctionItem): Promise<void> => {
    try {
      const { auction } = await api.post<{ auction: AuctionItem }>('/auctions', item)
      setUserListings((prev) => {
        const next = [auction, ...prev.filter((p) => p.id !== auction.id)]
        syncAuctionRecordFromItem(auction)
        return next
      })
    } catch {
      setUserListings((prev) => {
        const next = [item, ...prev.filter((p) => p.id !== item.id)]
        syncAuctionRecordFromItem(item)
        return next
      })
    }
  }, [])

  const updateListing = useCallback(async (item: AuctionItem): Promise<void> => {
    try {
      const { auction } = await api.put<{ auction: AuctionItem }>(`/auctions/${item.id}`, item)
      setUserListings((prev) => {
        const idx = prev.findIndex((p) => p.id === auction.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = auction
        syncAuctionRecordFromItem(auction)
        return next
      })
    } catch {
      setUserListings((prev) => {
        const idx = prev.findIndex((p) => p.id === item.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = item
        syncAuctionRecordFromItem(item)
        return next
      })
    }
  }, [])

  const placeBid = useCallback(async (args: PlaceBidArgs): Promise<boolean> => {
    if (args.amount < args.minBid) return false

    const entry: StoredBidHistoryEntry = {
      id: `b-${crypto.randomUUID()}`,
      user: 'You',
      time: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      amount: args.amount,
    }

    const isUserListing = userListingsRef.current.some((u) => u.id === args.auctionId)

    try {
      const { bid } = await api.post<{ bid: StoredBidHistoryEntry }>(
        `/auctions/${args.auctionId}/bids`,
        { amount: args.amount, minBid: args.minBid },
      )

      if (isUserListing) {
        setUserListings((prev) => {
          const idx = prev.findIndex((u) => u.id === args.auctionId)
          if (idx === -1) return prev
          const cur = prev[idx]
          const next = [...prev]
          next[idx] = { ...cur, currentBid: args.amount, bids: cur.bids + 1 }
          appendBidToUserAuction(args.auctionId, bid, cur.auctionEndsAt)
          return next
        })
      } else {
        const { updateLiveBidState } = await import('@/lib/liveAuctionBids')
        const staticBase = allAuctions.find((a) => a.id === args.auctionId)
        updateLiveBidState({
          auctionId: args.auctionId,
          amount: args.amount,
          baseFromCatalog: staticBase
            ? { currentBid: staticBase.currentBid, bids: staticBase.bids }
            : { currentBid: args.amount, bids: 0 },
          entry: bid,
          seedHistory: args.seedBidHistory,
        })
      }

      setLiveBidEpoch((e) => e + 1)
      return true
    } catch {
      if (isUserListing) {
        setUserListings((prev) => {
          const idx = prev.findIndex((u) => u.id === args.auctionId)
          if (idx === -1) return prev
          const cur = prev[idx]
          const next = [...prev]
          next[idx] = { ...cur, currentBid: args.amount, bids: cur.bids + 1 }
          appendBidToUserAuction(args.auctionId, entry, cur.auctionEndsAt)
          return next
        })
      }
      setLiveBidEpoch((e) => e + 1)
      return true
    }
  }, [])

  const mergedCatalog = useMemo(() => {
    const base = mergeCatalog(userListings)
    return base.map(applyLiveBidOverlay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userListings, liveBidEpoch])

  const value = useMemo(
    () => ({ userListings, addListing, updateListing, mergedCatalog, placeBid }),
    [userListings, addListing, updateListing, mergedCatalog, placeBid],
  )

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>
}

export function useListings() {
  const ctx = useContext(ListingsContext)
  if (!ctx) throw new Error('useListings must be used within ListingsProvider')
  return ctx
}
