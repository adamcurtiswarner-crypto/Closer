import { getSession } from '@/lib/auth'
import { getExperiments, createExperiment } from '@/lib/queries/experiments'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const experiments = await getExperiments()
  return NextResponse.json(experiments)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = await createExperiment(body)
  return NextResponse.json({ id }, { status: 201 })
}
