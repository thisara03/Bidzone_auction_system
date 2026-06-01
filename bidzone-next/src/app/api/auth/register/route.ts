import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb'
import { UserModel } from '@/models/User'
import { signToken } from '@/lib/auth'
import { toUserProfile } from '@/lib/userProfile'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      type?: string
      fullName?: string
      email?: string
      password?: string
      address?: string
      city?: string
      phone?: string
    }

    const { type, fullName, email, password, address, city, phone } = body

    if (!fullName?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectToDatabase()

    const exists = await UserModel.findOne({ email: email.toLowerCase().trim() })
    if (exists) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const isSeller = type === 'seller'

    const user = await UserModel.create({
      role: isSeller ? 'seller' : 'bidder',
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      address: address?.trim() ?? '',
      city: city?.trim() ?? '',
      phone: phone?.trim() ?? '',
      phoneVerified: isSeller,
      kycStatus: isSeller ? 'verified' : 'not_required',
      listingAllowed: isSeller,
      fraudCheckPassed: isSeller,
    })

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({ token, user: toUserProfile(user) }, { status: 201 })
  } catch (err) {
    console.error('[/api/auth/register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
