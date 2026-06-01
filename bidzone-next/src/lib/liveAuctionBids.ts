/**
 * Client-side cache for live bid state on static catalog auctions.
 * Writes through to this cache after a bid is persisted via the API.
 */

import type { StoredBidHistoryEntry } from './auctionRecords'

type LiveState = {
  currentBid: number
  bids: number
  history: StoredBidHistoryEntry[]
}

const STORAGE_KEY = 'bidzone-live-auction-bids'

function loadStore(): Record<string, LiveState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, LiveState>
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, LiveState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

export function getLiveBidState(auctionId: string): LiveState | null {
  const s = loadStore()[auctionId]
  if (!s || typeof s.currentBid !== 'number') return null
  return {
    currentBid: s.currentBid,
    bids: s.bids,
    history: Array.isArray(s.history) ? s.history : [],
  }
}

/** Called by ListingsContext after a bid is confirmed by the API. */
export function updateLiveBidState(params: {
  auctionId: string
  amount: number
  baseFromCatalog: { currentBid: number; bids: number }
  entry: StoredBidHistoryEntry
  seedHistory: StoredBidHistoryEntry[]
}): void {
  const store = loadStore()
  const cur = store[params.auctionId]
  if (!cur) {
    store[params.auctionId] = {
      currentBid: params.amount,
      bids: params.baseFromCatalog.bids + 1,
      history: [params.entry, ...params.seedHistory],
    }
  } else {
    store[params.auctionId] = {
      currentBid: params.amount,
      bids: cur.bids + 1,
      history: [params.entry, ...cur.history],
    }
  }
  saveStore(store)
}

/** @deprecated use updateLiveBidState — kept for backward compat */
export function placeLiveBid(params: {
  auctionId: string
  amount: number
  minBid: number
  baseFromCatalog: { currentBid: number; bids: number }
  seedHistory: StoredBidHistoryEntry[]
}): boolean {
  if (params.amount < params.minBid) return false
  const entry: StoredBidHistoryEntry = {
    id: `live-${Date.now()}`,
    user: 'You',
    time: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    amount: params.amount,
  }
  updateLiveBidState({
    auctionId: params.auctionId,
    amount: params.amount,
    baseFromCatalog: params.baseFromCatalog,
    entry,
    seedHistory: params.seedHistory,
  })
  return true
}
