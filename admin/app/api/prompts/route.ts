import { getSession } from '@/lib/auth'
import { getPrompts, createPrompt } from '@/lib/queries/prompts'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const prompts = await getPrompts({
    status: searchParams.get('status') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    depth: searchParams.get('depth') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  })

  return NextResponse.json(prompts)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = await createPrompt(body)
  return NextResponse.json({ id }, { status: 201 })
}
