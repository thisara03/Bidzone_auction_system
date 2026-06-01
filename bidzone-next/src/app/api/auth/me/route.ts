import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { UserModel } from '@/models/User'
import { requireAuth } from '@/lib/auth'
import { toUserProfile } from '@/lib/userProfile'

export async function GET(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const user = await UserModel.findById(claims.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: toUserProfile(user) })
  } catch (err) {
    console.error('[/api/auth/me GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      role?: string
      phone?: string
      phoneVerified?: boolean
      kycStatus?: string
      listingAllowed?: boolean
      fraudCheckPassed?: boolean
    }

    await connectToDatabase()

    const allowed: Record<string, unknown> = {}
    if (body.role !== undefined) allowed.role = body.role
    if (body.phone !== undefined) allowed.phone = body.phone
    if (body.phoneVerified !== undefined) allowed.phoneVerified = body.phoneVerified
    if (body.kycStatus !== undefined) allowed.kycStatus = body.kycStatus
    if (body.listingAllowed !== undefined) allowed.listingAllowed = body.listingAllowed
    if (body.fraudCheckPassed !== undefined) allowed.fraudCheckPassed = body.fraudCheckPassed

    const user = await UserModel.findByIdAndUpdate(
      claims.userId,
      { $set: allowed },
      { new: true, runValidators: true },
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: toUserProfile(user) })
  } catch (err) {
    console.error('[/api/auth/me PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
