import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/admin'
import { toAdminBanner } from '@/lib/banners'
import { PromotionBannerModel, type BannerPlacement, type BannerStatus } from '@/models/PromotionBanner'

const PLACEMENTS: BannerPlacement[] = [
  'left_primary',
  'left_secondary',
  'right_primary',
  'right_secondary',
]

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectToDatabase()

    const banners = await PromotionBannerModel.find({}).sort({ priority: -1, createdAt: -1 })

    return NextResponse.json({ banners: banners.map(toAdminBanner) })
  } catch (err) {
    console.error('[/api/admin/banners GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as {
      title?: string
      subtitle?: string
      imageUrl?: string
      linkUrl?: string
      placement?: string
      status?: string
      startsAt?: string
      endsAt?: string
      priority?: number
    }

    if (!body.title?.trim() || !body.imageUrl?.trim() || !body.placement || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!PLACEMENTS.includes(body.placement as BannerPlacement)) {
      return NextResponse.json({ error: 'Invalid placement' }, { status: 400 })
    }

    const startsAt = new Date(body.startsAt)
    const endsAt = new Date(body.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const status = (body.status ?? 'draft') as BannerStatus
    if (!['draft', 'active', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await connectToDatabase()

    const banner = await PromotionBannerModel.create({
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() ?? '',
      imageUrl: body.imageUrl.trim(),
      linkUrl: body.linkUrl?.trim() ?? '',
      placement: body.placement as BannerPlacement,
      status,
      startsAt,
      endsAt,
      priority: body.priority ?? 0,
      createdBy: admin.userId,
    })

    return NextResponse.json({ banner: toAdminBanner(banner) }, { status: 201 })
  } catch (err) {
    console.error('[/api/admin/banners POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
