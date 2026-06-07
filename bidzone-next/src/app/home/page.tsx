'use client'
import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { HomePage } from '@/components/layout/HomePage'

function HomePageRouteInner() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return <HomePage />
}

export default function HomePageRoute() {
  return (
    <Suspense fallback={null}>
      <HomePageRouteInner />
    </Suspense>
  )
}
