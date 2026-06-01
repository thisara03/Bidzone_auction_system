import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { AuctionModel } from '@/models/Auction'
import { BidModel } from '@/models/Bid'
import { requireAuth } from '@/lib/auth'
import { UserModel } from '@/models/User'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await connectToDatabase()

    const bids = await BidModel.find({ auctionId: id })
      .sort({ placedAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      bids: bids.map((b) => ({
        id: b._id.toString(),
        user: b.userName,
        time: new Date(b.placedAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        amount: b.amount,
      })),
    })
  } catch (err) {
    console.error('[/api/auctions/[id]/bids GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = (await req.json()) as { amount?: number; minBid?: number }

    if (body.amount == null || !Number.isFinite(body.amount)) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 })
    }

    await connectToDatabase()

    const auction = await AuctionModel.findById(id)
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.auctionEndsAt && new Date() > auction.auctionEndsAt) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 })
    }

    const minRequired = body.minBid ?? auction.currentBid + 1
    if (body.amount < minRequired) {
      return NextResponse.json(
        { error: `Bid must be at least $${minRequired}` },
        { status: 400 },
      )
    }

    const bidder = await UserModel.findById(claims.userId)
    const userName = bidder?.fullName ?? 'Bidder'

    const bid = await BidModel.create({
      auctionId: id,
      userId: claims.userId,
      userName,
      amount: body.amount,
      placedAt: new Date(),
    })

    await AuctionModel.findByIdAndUpdate(id, {
      $set: { currentBid: body.amount },
      $inc: { bids: 1 },
    })

    return NextResponse.json(
      {
        bid: {
          id: bid._id.toString(),
          user: bid.userName,
          time: new Date(bid.placedAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          amount: bid.amount,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[/api/auctions/[id]/bids POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
