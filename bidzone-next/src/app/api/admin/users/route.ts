import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { requireAdmin, toAdminUserSummary } from '@/lib/admin'
import { UserModel } from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const kycStatus = searchParams.get('kycStatus')
    const q = searchParams.get('q')?.trim().toLowerCase()

    const filter: Record<string, unknown> = {}
    if (role && ['bidder', 'seller', 'admin'].includes(role)) {
      filter.role = role
    }
    if (kycStatus && ['not_required', 'pending', 'verified', 'rejected'].includes(kycStatus)) {
      filter.kycStatus = kycStatus
    }
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ]
    }

    await connectToDatabase()

    const users = await UserModel.find(filter).sort({ createdAt: -1 }).limit(200)

    return NextResponse.json({ users: users.map(toAdminUserSummary) })
  } catch (err) {
    console.error('[/api/admin/users GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
