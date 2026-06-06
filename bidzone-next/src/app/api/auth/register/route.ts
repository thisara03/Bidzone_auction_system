import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb'
import { UserModel } from '@/models/User'
import { buildAuthResponse } from '@/lib/authResponse'

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

    const normalEmail = email.toLowerCase().trim()
    const exists = await UserModel.findOne({ email: normalEmail })
    if (exists) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const isSeller = type === 'seller'

    const user = await UserModel.create({
      role: isSeller ? 'seller' : 'bidder',
      fullName: fullName.trim(),
      email: normalEmail,
      passwordHash,
      address: address?.trim() ?? '',
      city: city?.trim() ?? '',
      phone: phone?.trim() ?? '',
      phoneVerified: false,
      kycStatus: isSeller ? 'pending' : 'not_required',
      listingAllowed: false,
      fraudCheckPassed: false,
    })

    return NextResponse.json(await buildAuthResponse(user), { status: 201 })
  } catch (err) {
    console.error('[/api/auth/register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
