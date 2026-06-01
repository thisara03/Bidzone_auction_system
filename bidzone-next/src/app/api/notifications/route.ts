import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { NotificationModel, type NotificationKind } from '@/models/Notification'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const notifications = await NotificationModel.find({ userId: claims.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        kind: n.kind,
        read: n.read,
        createdAt: new Date(n.createdAt).getTime(),
        meta: n.meta ?? {},
      })),
    })
  } catch (err) {
    console.error('[/api/notifications GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      kind?: NotificationKind
      meta?: Record<string, unknown>
    }

    if (!body.kind) {
      return NextResponse.json({ error: 'Missing kind' }, { status: 400 })
    }

    await connectToDatabase()

    const notification = await NotificationModel.create({
      userId: claims.userId,
      kind: body.kind as NotificationKind,
      read: false,
      meta: body.meta ?? {},
    })

    return NextResponse.json(
      {
        notification: {
          id: notification._id.toString(),
          kind: notification.kind,
          read: notification.read,
          createdAt: new Date(notification.createdAt).getTime(),
          meta: notification.meta ?? {},
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[/api/notifications POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const claims = requireAuth(req)
    if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    await NotificationModel.deleteMany({ userId: claims.userId })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/notifications DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
