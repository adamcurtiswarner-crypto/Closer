import { getSession } from '@/lib/auth'
import { getCohortDetail } from '@/lib/queries/cohorts'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const detail = await getCohortDetail(id)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(detail)
}
