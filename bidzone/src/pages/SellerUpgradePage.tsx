import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SellerKycWizard } from './SellerKycWizard'

export function SellerUpgradePage() {
  const { isAuthenticated, canAccessSellerTools, user } = useAuth()
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }
  if (canAccessSellerTools) {
    return <Navigate to="/dashboard" replace />
  }
  if (user.role !== 'bidder') {
    return <Navigate to="/home" replace />
  }
  return <SellerKycWizard mode="upgrade" bidder={user} />
}
