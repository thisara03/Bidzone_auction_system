import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb'
import { UserModel } from '@/models/User'
import { signToken } from '@/lib/auth'
import { toUserProfile } from '@/lib/userProfile'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const { email, password } = body

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    await connectToDatabase()

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({ token, user: toUserProfile(user) })
  } catch (err) {
    console.error('[/api/auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
