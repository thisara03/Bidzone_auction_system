import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SellerKycWizard } from './SellerKycWizard'

export function OnboardingSellerPage() {
  const { canAccessSellerTools } = useAuth()
  if (canAccessSellerTools) {
    return <Navigate to="/dashboard" replace />
  }
  return <SellerKycWizard mode="new" />
}
