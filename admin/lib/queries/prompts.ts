import { adminDb } from '@/lib/firebase-admin'
import admin from '@/lib/firebase-admin'

export interface PromptRow {
  id: string
  text: string
  hint: string | null
  type: string
  emotional_depth: string
  status: string
  completion_rate: number
  positive_response_rate: number
  times_assigned: number
  times_completed: number
  ai_generated: boolean
  created_at: string
}

export interface PromptDetail extends PromptRow {
  research_basis: string
  requires_conversation: boolean
  avg_response_length: number
  week_restriction: number | null
  max_per_week: number | null
  day_preference: number[] | null
  testing_started_at: string | null
  status_changed_at: string
  created_by: string
}

export async function getPrompts(filters?: {
  status?: string
  type?: string
  depth?: string
  search?: string
}): Promise<PromptRow[]> {
  let query: FirebaseFirestore.Query = adminDb.collection('prompts')

  if (filters?.status) {
    query = query.where('status', '==', filters.status)
  }
  if (filters?.type) {
    query = query.where('type', '==', filters.type)
  }
  if (filters?.depth) {
    query = query.where('emotional_depth', '==', filters.depth)
  }

  const snap = await query.orderBy('created_at', 'desc').get()

  let results = snap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      text: d.text,
      hint: d.hint ?? null,
      type: d.type,
      emotional_depth: d.emotional_depth,
      status: d.status,
      completion_rate: d.completion_rate ?? 0,
      positive_response_rate: d.positive_response_rate ?? 0,
      times_assigned: d.times_assigned ?? 0,
      times_completed: d.times_completed ?? 0,
      ai_generated: d.ai_generated ?? false,
      created_at: d.created_at?.toDate?.()?.toISOString() ?? '',
    }
  })

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter(p => p.text.toLowerCase().includes(s))
  }

  return results
}

export async function getPromptById(id: string): Promise<PromptDetail | null> {
  const doc = await adminDb.collection('prompts').doc(id).get()
  if (!doc.exists) return null

  const d = doc.data()!
  return {
    id: doc.id,
    text: d.text,
    hint: d.hint ?? null,
    type: d.type,
    research_basis: d.research_basis,
    emotional_depth: d.emotional_depth,
    requires_conversation: d.requires_conversation ?? false,
    status: d.status,
    completion_rate: d.completion_rate ?? 0,
    positive_response_rate: d.positive_response_rate ?? 0,
    times_assigned: d.times_assigned ?? 0,
    times_completed: d.times_completed ?? 0,
    avg_response_length: d.avg_response_length ?? 0,
    ai_generated: d.ai_generated ?? false,
    week_restriction: d.week_restriction ?? null,
    max_per_week: d.max_per_week ?? null,
    day_preference: d.day_preference ?? null,
    testing_started_at: d.testing_started_at?.toDate?.()?.toISOString() ?? null,
    status_changed_at: d.status_changed_at?.toDate?.()?.toISOString() ?? '',
    created_by: d.created_by ?? '',
    created_at: d.created_at?.toDate?.()?.toISOString() ?? '',
  }
}

export async function createPrompt(fields: {
  text: string
  hint?: string
  type: string
  research_basis: string
  emotional_depth: string
  requires_conversation?: boolean
  week_restriction?: number | null
  max_per_week?: number | null
  day_preference?: number[] | null
  status: string
}) {
  const now = admin.firestore.FieldValue.serverTimestamp()
  const ref = await adminDb.collection('prompts').add({
    ...fields,
    hint: fields.hint ?? null,
    requires_conversation: fields.requires_conversation ?? false,
    week_restriction: fields.week_restriction ?? null,
    max_per_week: fields.max_per_week ?? null,
    day_preference: fields.day_preference ?? null,
    times_assigned: 0,
    times_completed: 0,
    completion_rate: 0,
    avg_response_length: 0,
    positive_response_rate: 0,
    ai_generated: false,
    created_by: 'admin',
    created_at: now,
    updated_at: now,
    status_changed_at: now,
    testing_started_at: fields.status === 'testing' ? now : null,
  })
  return ref.id
}

export async function updatePrompt(id: string, fields: Record<string, unknown>) {
  const now = admin.firestore.FieldValue.serverTimestamp()
  const updateData: Record<string, unknown> = { ...fields, updated_at: now }

  if (fields.status) {
    updateData.status_changed_at = now
    if (fields.status === 'testing') {
      updateData.testing_started_at = now
    }
  }

  await adminDb.collection('prompts').doc(id).update(updateData)
}

export async function promotePrompt(id: string) {
  const doc = await adminDb.collection('prompts').doc(id).get()
  if (!doc.exists) throw new Error('Prompt not found')

  const data = doc.data()!
  const nextStatus = data.status === 'draft' ? 'testing' : data.status === 'testing' ? 'active' : null
  if (!nextStatus) throw new Error(`Cannot promote from status: ${data.status}`)

  await updatePrompt(id, { status: nextStatus })
}

export async function retirePrompt(id: string) {
  await updatePrompt(id, { status: 'retired' })
}
