'use client'

import { useQuery } from '@tanstack/react-query'
import type { DashboardMetrics, WmeerTrend, Alert } from '@/lib/queries/dashboard'

interface DashboardData {
  metrics: DashboardMetrics
  wmeerTrend: WmeerTrend[]
  alerts: Alert[]
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })
}
