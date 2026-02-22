import { getSession } from '@/lib/auth'
import { getCohorts, getRetentionHeatmap } from '@/lib/queries/cohorts'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'retention') {
    const heatmap = await getRetentionHeatmap()
    return NextResponse.json(heatmap)
  }

  const cohorts = await getCohorts()
  return NextResponse.json(cohorts)
}
