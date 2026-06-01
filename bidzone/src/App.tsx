import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { HomePage } from './pages/HomePage'
import { LoginGate } from './pages/LoginGate'
import { OnboardingBidderPage } from './pages/OnboardingBidderPage'
import { OnboardingRolePage } from './pages/OnboardingRolePage'
import { OnboardingSellerPage } from './pages/OnboardingSellerPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SellerDashboardPage } from './pages/SellerDashboardPage'
import { SellerNewListingPage } from './pages/SellerNewListingPage'
import { SellerUpgradePage } from './pages/SellerUpgradePage'
import { CheckoutReviewPage } from './pages/CheckoutReviewPage'
import { CheckoutPaymentPage } from './pages/CheckoutPaymentPage'

function ProtectedHome() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <HomePage />
}

function ProtectedListing() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <ProductDetailPage />
}

function ProtectedDashboard() {
  const { isAuthenticated, canAccessSellerTools } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  if (!canAccessSellerTools) {
    return <Navigate to="/home" replace />
  }
  return <SellerDashboardPage />
}

function ProtectedSellerNew() {
  const { isAuthenticated, canAccessSellerTools } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  if (!canAccessSellerTools) {
    return <Navigate to="/home" replace />
  }
  return <SellerNewListingPage />
}

function ProtectedSellerEdit() {
  const { isAuthenticated, canAccessSellerTools } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  if (!canAccessSellerTools) {
    return <Navigate to="/home" replace />
  }
  return <SellerNewListingPage />
}

function ProtectedCheckoutLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginGate />} />
      <Route path="/onboarding" element={<OnboardingRolePage />} />
      <Route path="/onboarding/bidder" element={<OnboardingBidderPage />} />
      <Route path="/onboarding/seller" element={<OnboardingSellerPage />} />
      <Route path="/onboarding/seller-upgrade" element={<SellerUpgradePage />} />
      <Route path="/home" element={<ProtectedHome />} />
      <Route path="/listing/:id" element={<ProtectedListing />} />
      <Route path="/dashboard" element={<ProtectedDashboard />} />
      <Route path="/seller/new" element={<ProtectedSellerNew />} />
      <Route path="/seller/edit/:id" element={<ProtectedSellerEdit />} />
      <Route path="/checkout" element={<ProtectedCheckoutLayout />}>
        <Route index element={<CheckoutReviewPage />} />
        <Route path="payment" element={<CheckoutPaymentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
