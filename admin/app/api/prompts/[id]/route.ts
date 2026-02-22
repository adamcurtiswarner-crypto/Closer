import { getSession } from '@/lib/auth'
import { getPromptById, updatePrompt, promotePrompt, retirePrompt } from '@/lib/queries/prompts'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const prompt = await getPromptById(id)
  if (!prompt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(prompt)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, ...fields } = body

  if (action === 'promote') {
    await promotePrompt(id)
  } else if (action === 'retire') {
    await retirePrompt(id)
  } else {
    await updatePrompt(id, fields)
  }

  return NextResponse.json({ success: true })
}
