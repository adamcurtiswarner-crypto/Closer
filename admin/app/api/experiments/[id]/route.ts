import { getSession } from '@/lib/auth'
import { getExperimentById, updateExperimentStatus } from '@/lib/queries/experiments'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const experiment = await getExperimentById(id)
  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(experiment)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!['running', 'paused', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await updateExperimentStatus(id, status)
  return NextResponse.json({ success: true })
}
