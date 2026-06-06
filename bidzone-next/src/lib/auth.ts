/**
 * Server-side only — JWT sign/verify utilities.
 * Never import this file from client components.
 */
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { getJwtSecret, missingEnvError } from '@/lib/env'

export type JwtPayload = {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = getJwtSecret()
  if (!secret) throw missingEnvError('JWT_SECRET')
  return jwt.sign(payload, secret, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = getJwtSecret()
  if (!secret) return null
  try {
    return jwt.verify(token, secret) as JwtPayload
  } catch {
    return null
  }
}

export function requireAuth(req: NextRequest): JwtPayload | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}
