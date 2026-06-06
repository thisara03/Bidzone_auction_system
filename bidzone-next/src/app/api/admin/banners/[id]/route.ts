import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/admin'
import { toAdminBanner } from '@/lib/banners'
import { PromotionBannerModel, type BannerPlacement, type BannerStatus } from '@/models/PromotionBanner'

type RouteParams = { params: Promise<{ id: string }> }

const PLACEMENTS: BannerPlacement[] = [
  'left_primary',
  'left_secondary',
  'right_primary',
  'right_secondary',
]

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
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

    await connectToDatabase()

    const banner = await PromotionBannerModel.findById(id)
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    if (body.title !== undefined) banner.title = body.title.trim()
    if (body.subtitle !== undefined) banner.subtitle = body.subtitle.trim()
    if (body.imageUrl !== undefined) banner.imageUrl = body.imageUrl.trim()
    if (body.linkUrl !== undefined) banner.linkUrl = body.linkUrl.trim()

    if (body.placement !== undefined) {
      if (!PLACEMENTS.includes(body.placement as BannerPlacement)) {
        return NextResponse.json({ error: 'Invalid placement' }, { status: 400 })
      }
      banner.placement = body.placement as BannerPlacement
    }

    if (body.status !== undefined) {
      if (!['draft', 'active', 'paused'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      banner.status = body.status as BannerStatus
    }

    if (body.startsAt !== undefined) {
      const startsAt = new Date(body.startsAt)
      if (Number.isNaN(startsAt.getTime())) {
        return NextResponse.json({ error: 'Invalid startsAt' }, { status: 400 })
      }
      banner.startsAt = startsAt
    }

    if (body.endsAt !== undefined) {
      const endsAt = new Date(body.endsAt)
      if (Number.isNaN(endsAt.getTime())) {
        return NextResponse.json({ error: 'Invalid endsAt' }, { status: 400 })
      }
      banner.endsAt = endsAt
    }

    if (banner.endsAt <= banner.startsAt) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    if (body.priority !== undefined) banner.priority = body.priority

    await banner.save()

    return NextResponse.json({ banner: toAdminBanner(banner) })
  } catch (err) {
    console.error('[/api/admin/banners/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await connectToDatabase()

    const banner = await PromotionBannerModel.findByIdAndDelete(id)
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/admin/banners/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
