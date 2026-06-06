'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { AdminDashboardPage } from '@/components/admin/AdminDashboardPage'

export default function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/')
    } else if (!isAdmin) {
      router.replace('/home')
    }
  }, [isAuthenticated, isAdmin, router])

  if (!isAuthenticated || !isAdmin) return null

  return <AdminDashboardPage />
}
