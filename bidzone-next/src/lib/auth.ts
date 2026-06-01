/**
 * Server-side only — JWT sign/verify utilities.
 * Never import this file from client components.
 */
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('Please define JWT_SECRET in .env.local')
}

export type JwtPayload = {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JwtPayload
  } catch {
    return null
  }
}

export function requireAuth(req: NextRequest): JwtPayload | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}
