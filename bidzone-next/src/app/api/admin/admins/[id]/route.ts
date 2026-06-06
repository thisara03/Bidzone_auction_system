import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import {
  demoteAdminUser,
  isActiveAdmin,
  isProtectedAdmin,
  requireAdmin,
  toAdminUserSummary,
} from '@/lib/admin'
import { UserModel } from '@/models/User'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (admin.userId === id) {
      return NextResponse.json({ error: 'Cannot demote your own account' }, { status: 403 })
    }

    await connectToDatabase()

    const user = await UserModel.findById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!isActiveAdmin(user)) {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 400 })
    }

    if (isProtectedAdmin(user)) {
      return NextResponse.json(
        { error: 'Cannot demote a protected main admin' },
        { status: 403 },
      )
    }

    if (!user.delegatedAdmin) {
      return NextResponse.json({ error: 'Only delegated admins can be demoted' }, { status: 403 })
    }

    await demoteAdminUser(user)

    return NextResponse.json({ user: toAdminUserSummary(user) })
  } catch (err) {
    console.error('[/api/admin/admins/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
