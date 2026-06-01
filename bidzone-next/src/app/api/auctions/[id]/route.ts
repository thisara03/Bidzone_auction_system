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

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await connectToDatabase()

    const auction = await AuctionModel.findById(id)
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    return NextResponse.json({ auction: toAuctionItem(auction) })
  } catch (err) {
    console.error('[/api/auctions/[id] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = (await req.json()) as Partial<AuctionItem>

    await connectToDatabase()

    const existing = await AuctionModel.findById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (existing.sellerId !== claims.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: Partial<IAuction> = {}
    if (body.title != null) updates.title = body.title.trim()
    if (body.image != null) updates.image = body.image
    if (body.category != null) updates.category = body.category
    if (body.currentBid != null) updates.currentBid = body.currentBid
    if (body.buyNow !== undefined) updates.buyNow = body.buyNow
    if (body.reservePrice !== undefined) updates.reservePrice = body.reservePrice
    if (body.bids != null) updates.bids = body.bids
    if (body.timeLeft != null) updates.timeLeft = body.timeLeft
    if (body.sellerName != null) updates.sellerName = body.sellerName
    if (body.listingDescription !== undefined) updates.listingDescription = body.listingDescription
    if (body.condition != null) updates.condition = body.condition
    if (body.auctionEndsAt != null) updates.auctionEndsAt = new Date(body.auctionEndsAt)

    const updated = await AuctionModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )

    return NextResponse.json({ auction: toAuctionItem(updated!) })
  } catch (err) {
    console.error('[/api/auctions/[id] PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectToDatabase()

    const existing = await AuctionModel.findById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (existing.sellerId !== claims.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await AuctionModel.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/auctions/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
