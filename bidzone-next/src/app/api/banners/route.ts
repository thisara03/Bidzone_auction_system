import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { PromotionBannerModel } from '@/models/PromotionBanner'
import { isBannerPubliclyVisible, toPublicBanner } from '@/lib/banners'
import { getMongoUri } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public active banners for marketplace ad rails (no auth). */
export async function GET() {
  if (!getMongoUri()) {
    return NextResponse.json({ banners: [] })
  }
  try {
    await connectToDatabase()

    const now = new Date()
    const banners = await PromotionBannerModel.find({ status: 'active' })
      .sort({ priority: -1, createdAt: -1 })

    const visible = banners.filter((b) => isBannerPubliclyVisible(b, now))

    return NextResponse.json({ banners: visible.map(toPublicBanner) })
  } catch (err) {
    console.error('[/api/banners GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
