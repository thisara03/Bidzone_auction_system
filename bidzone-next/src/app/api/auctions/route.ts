import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { AuctionModel, type IAuction } from '@/models/Auction'
import { requireAuth } from '@/lib/auth'
import type { AuctionItem } from '@/data/auctions'

function toAuctionItem(doc: IAuction): AuctionItem {
  return {
    id: doc._id.toString(),
    title: doc.title,
    image: doc.image,
    category: doc.category,
    currentBid: doc.currentBid,
    buyNow: doc.buyNow,
    reservePrice: doc.reservePrice,
    bids: doc.bids,
    timeLeft: doc.timeLeft,
    urgent: doc.urgent,
    featured: doc.featured,
    sellerName: doc.sellerName,
    listingDescription: doc.listingDescription,
    condition: doc.condition,
    auctionEndsAt: doc.auctionEndsAt?.toISOString(),
    auctionCreatedAt: doc.auctionCreatedAt?.toISOString(),
  }
}

export async function GET() {
  try {
    await connectToDatabase()
    const auctions = await AuctionModel.find({}).sort({ auctionCreatedAt: -1 }).lean()
    return NextResponse.json({ auctions: auctions.map(toAuctionItem) })
  } catch (err) {
    console.error('[/api/auctions GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as Partial<AuctionItem> & { sellerId?: string }

    if (!body.title?.trim() || !body.image || !body.category || body.currentBid == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectToDatabase()

    const auction = await AuctionModel.create({
      title: body.title.trim(),
      image: body.image,
      category: body.category,
      currentBid: body.currentBid,
      buyNow: body.buyNow,
      reservePrice: body.reservePrice,
      bids: body.bids ?? 0,
      timeLeft: body.timeLeft ?? '',
      urgent: body.urgent ?? false,
      featured: body.featured ?? false,
      sellerName: body.sellerName,
      sellerId: claims.userId,
      listingDescription: body.listingDescription,
      condition: body.condition,
      auctionEndsAt: body.auctionEndsAt ? new Date(body.auctionEndsAt) : undefined,
      auctionCreatedAt: body.auctionCreatedAt ? new Date(body.auctionCreatedAt) : new Date(),
      source: 'user',
    })

    return NextResponse.json({ auction: toAuctionItem(auction) }, { status: 201 })
  } catch (err) {
    console.error('[/api/auctions POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
