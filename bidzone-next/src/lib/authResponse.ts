import { signToken } from '@/lib/auth'
import { syncAdminRole } from '@/lib/admin'
import { toUserProfile } from '@/lib/userProfile'
import type { IUser } from '@/models/User'

/** Issue a fresh JWT after syncing admin role from env allowlist. */
export async function buildAuthResponse(user: IUser) {
  const synced = await syncAdminRole(user)
  const token = signToken({
    userId: synced._id.toString(),
    email: synced.email,
    role: synced.role,
  })
  return { token, user: toUserProfile(synced) }
}
