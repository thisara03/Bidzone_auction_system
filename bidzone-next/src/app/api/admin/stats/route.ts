import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/admin'
import { UserModel } from '@/models/User'
import { AuctionModel } from '@/models/Auction'
import { BidModel } from '@/models/Bid'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectToDatabase()

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      bidders,
      sellers,
      admins,
      pendingKyc,
      rejectedKyc,
      pendingListings,
      totalAuctions,
      activeAuctions,
      totalBids,
      bidsToday,
      newUsersWeek,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'bidder' }),
      UserModel.countDocuments({ role: 'seller' }),
      UserModel.countDocuments({ role: 'admin' }),
      UserModel.countDocuments({ kycStatus: 'pending' }),
      UserModel.countDocuments({ kycStatus: 'rejected' }),
      AuctionModel.countDocuments({ moderationStatus: 'pending' }),
      AuctionModel.countDocuments(),
      AuctionModel.countDocuments({ moderationStatus: 'approved', auctionEndsAt: { $gt: now } }),
      BidModel.countDocuments(),
      BidModel.countDocuments({ placedAt: { $gte: dayAgo } }),
      UserModel.countDocuments({ createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }),
    ])

    const recentUsers = await UserModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email role kycStatus createdAt')
      .lean()

    const recentAuctions = await AuctionModel.find({ moderationStatus: 'approved' })
      .sort({ auctionCreatedAt: -1 })
      .limit(5)
      .select('title currentBid bids sellerName auctionCreatedAt featured')
      .lean()

    return NextResponse.json({
      stats: {
        totalUsers,
        bidders,
        sellers,
        admins,
        pendingKyc,
        rejectedKyc,
        pendingListings,
        totalAuctions,
        activeAuctions,
        totalBids,
        bidsToday,
        newUsersWeek,
      },
      recentUsers: recentUsers.map((u) => ({
        id: u._id.toString(),
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        kycStatus: u.kycStatus,
        createdAt: u.createdAt.toISOString(),
      })),
      recentAuctions: recentAuctions.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        currentBid: a.currentBid,
        bids: a.bids,
        sellerName: a.sellerName,
        featured: a.featured,
        auctionCreatedAt: a.auctionCreatedAt?.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[/api/admin/stats GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
