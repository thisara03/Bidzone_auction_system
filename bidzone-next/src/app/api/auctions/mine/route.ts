import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { AuctionModel } from '@/models/Auction'
import { requireAuth } from '@/lib/auth'
import { toAuctionItem } from '@/lib/auctionMapper'

/** Seller's own listings (all moderation statuses) */
export async function GET(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const auctions = await AuctionModel.find({ sellerId: claims.userId }).sort({ auctionCreatedAt: -1 })

    return NextResponse.json({ auctions: auctions.map(toAuctionItem) })
  } catch (err) {
    console.error('[/api/auctions/mine GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
