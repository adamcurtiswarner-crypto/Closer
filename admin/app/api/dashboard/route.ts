import { getSession } from '@/lib/auth'
import { getDashboardMetrics, getWmeerTrend, getAlerts } from '@/lib/queries/dashboard'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [metrics, wmeerTrend, alerts] = await Promise.all([
    getDashboardMetrics(),
    getWmeerTrend(),
    getAlerts(),
  ])

  return NextResponse.json({ metrics, wmeerTrend, alerts })
}
