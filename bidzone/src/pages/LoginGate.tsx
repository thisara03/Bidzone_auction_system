import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoginPage } from './LoginPage'

/** Shows login, or redirects to home if already signed in. */
export function LoginGate() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }
  return <LoginPage />
}
