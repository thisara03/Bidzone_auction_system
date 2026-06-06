import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import {
  isActiveAdmin,
  isProtectedAdmin,
  promoteToDelegatedAdmin,
  requireAdmin,
  toAdminUserSummary,
} from '@/lib/admin'
import { UserModel } from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectToDatabase()

    const admins = await UserModel.find({ role: 'admin' }).sort({ createdAt: 1 })

    return NextResponse.json({
      admins: admins.filter(isActiveAdmin).map(toAdminUserSummary),
    })
  } catch (err) {
    console.error('[/api/admin/admins GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as { userId?: string }
    if (!body.userId?.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await connectToDatabase()

    const user = await UserModel.findById(body.userId.trim())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (isActiveAdmin(user)) {
      return NextResponse.json({ error: 'User is already an admin' }, { status: 409 })
    }

    await promoteToDelegatedAdmin(user)

    return NextResponse.json({ user: toAdminUserSummary(user) }, { status: 201 })
  } catch (err) {
    console.error('[/api/admin/admins POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
