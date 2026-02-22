import { adminDb } from '@/lib/firebase-admin'

export interface CohortRow {
  id: string           // the cohort_week string
  week: string
  couplesCount: number
  activeCount: number
  wmeer: number
  w1Retention: number
  w4Retention: number
  w12Retention: number
  status: 'active' | 'mature' | 'graduated'
}

export interface CohortDetail extends CohortRow {
  startDate: string
  currentWeekNumber: number
  couples: CohortCouple[]
}

export interface CohortCouple {
  id: string
  memberEmails: string[]
  status: string
  totalCompletions: number
  lastActiveAt: string | null
  churnRiskLevel: string | null
}

export interface RetentionCell {
  cohort: string
  week: number
  retention: number
}

function getCurrentWeek(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 604800000
  const weekNum = Math.ceil((diff / oneWeek) + start.getDay() / 7)
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function parseWeek(week: string): { year: number; weekNum: number } {
  const [year, w] = week.split('-W').map(Number)
  return { year, weekNum: w }
}

function weeksBetween(a: string, b: string): number {
  const pa = parseWeek(a)
  const pb = parseWeek(b)
  return (pb.year - pa.year) * 52 + (pb.weekNum - pa.weekNum)
}

/** Get an ISO date string for the Monday of a given ISO week */
function weekToDate(week: string): string {
  const { year, weekNum } = parseWeek(week)
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7)
  return monday.toISOString().split('T')[0]
}

function cohortStatus(cohortWeek: string, currentWeek: string): 'active' | 'mature' | 'graduated' {
  const age = weeksBetween(cohortWeek, currentWeek)
  if (age <= 4) return 'active'
  if (age <= 12) return 'mature'
  return 'graduated'
}

export async function getCohorts(): Promise<CohortRow[]> {
  const currentWeek = getCurrentWeek()

  // Fetch all couples that have a cohort_week
  const couplesSnap = await adminDb.collection('couples')
    .where('cohort_week', '!=', null)
    .get()

  // Group couples by cohort_week
  const cohortMap = new Map<string, { total: number; active: number; coupleIds: string[] }>()

  for (const doc of couplesSnap.docs) {
    const data = doc.data()
    const week = data.cohort_week as string
    if (!week) continue

    const entry = cohortMap.get(week) ?? { total: 0, active: 0, coupleIds: [] }
    entry.total++
    entry.coupleIds.push(doc.id)
    if (data.status === 'active') entry.active++
    cohortMap.set(week, entry)
  }

  // Fetch all completions to compute WMEER and retention per cohort
  const completionsSnap = await adminDb.collection('prompt_completions').get()

  // Build a map: coupleId -> set of completion weeks
  const coupleCompletionWeeks = new Map<string, Set<string>>()
  for (const doc of completionsSnap.docs) {
    const data = doc.data()
    const coupleId = data.couple_id as string
    const week = data.week as string
    if (!coupleId || !week) continue

    const existing = coupleCompletionWeeks.get(coupleId) ?? new Set()
    existing.add(week)
    coupleCompletionWeeks.set(coupleId, existing)
  }

  const rows: CohortRow[] = []

  for (const [cohortWeek, { total, active, coupleIds }] of cohortMap) {
    let w1Count = 0
    let w4Count = 0
    let w12Count = 0
    let totalCompletions = 0

    for (const coupleId of coupleIds) {
      const weeks = coupleCompletionWeeks.get(coupleId)
      if (!weeks) continue

      totalCompletions += weeks.size

      let hasW1 = false
      let hasW4 = false
      let hasW12 = false

      for (const w of weeks) {
        const offset = weeksBetween(cohortWeek, w)
        if (offset === 0) hasW1 = true
        if (offset === 3) hasW4 = true
        if (offset === 11) hasW12 = true
      }

      if (hasW1) w1Count++
      if (hasW4) w4Count++
      if (hasW12) w12Count++
    }

    // WMEER: simple approximation = completions / (couples * weeks_since_start)
    const age = Math.max(1, weeksBetween(cohortWeek, currentWeek))
    const wmeer = total > 0 ? (totalCompletions / (total * age)) * 100 : 0

    rows.push({
      id: cohortWeek,
      week: cohortWeek,
      couplesCount: total,
      activeCount: active,
      wmeer: Math.round(wmeer * 10) / 10,
      w1Retention: total > 0 ? Math.round((w1Count / total) * 100) : 0,
      w4Retention: total > 0 ? Math.round((w4Count / total) * 100) : 0,
      w12Retention: total > 0 ? Math.round((w12Count / total) * 100) : 0,
      status: cohortStatus(cohortWeek, currentWeek),
    })
  }

  // Sort by week descending (newest first)
  rows.sort((a, b) => b.week.localeCompare(a.week))

  return rows
}

export async function getCohortDetail(cohortWeek: string): Promise<CohortDetail | null> {
  const currentWeek = getCurrentWeek()

  // Fetch couples for this cohort
  const couplesSnap = await adminDb.collection('couples')
    .where('cohort_week', '==', cohortWeek)
    .get()

  if (couplesSnap.empty) return null

  const coupleIds = couplesSnap.docs.map((d) => d.id)

  // Fetch user emails for these couples
  const coupleMembers = new Map<string, string[]>()
  const usersSnap = await adminDb.collection('users')
    .where('couple_id', 'in', coupleIds.slice(0, 30)) // Firestore 'in' limit is 30
    .get()

  for (const doc of usersSnap.docs) {
    const data = doc.data()
    const cid = data.couple_id as string
    if (!cid) continue
    const existing = coupleMembers.get(cid) ?? []
    existing.push(data.email as string ?? doc.id)
    coupleMembers.set(cid, existing)
  }

  // Fetch completions for these couples
  const completionsSnap = await adminDb.collection('prompt_completions').get()
  const coupleCompletionWeeks = new Map<string, Set<string>>()

  for (const doc of completionsSnap.docs) {
    const data = doc.data()
    const coupleId = data.couple_id as string
    if (!coupleIds.includes(coupleId)) continue
    const week = data.week as string
    if (!week) continue

    const existing = coupleCompletionWeeks.get(coupleId) ?? new Set()
    existing.add(week)
    coupleCompletionWeeks.set(coupleId, existing)
  }

  let activeCount = 0
  let w1Count = 0
  let w4Count = 0
  let w12Count = 0
  let totalCompletions = 0

  const couples: CohortCouple[] = couplesSnap.docs.map((doc) => {
    const data = doc.data()
    if (data.status === 'active') activeCount++

    const weeks = coupleCompletionWeeks.get(doc.id)
    const completionCount = weeks?.size ?? 0
    totalCompletions += completionCount

    // Retention per couple
    let hasW1 = false
    let hasW4 = false
    let hasW12 = false

    if (weeks) {
      for (const w of weeks) {
        const offset = weeksBetween(cohortWeek, w)
        if (offset === 0) hasW1 = true
        if (offset === 3) hasW4 = true
        if (offset === 11) hasW12 = true
      }
    }

    if (hasW1) w1Count++
    if (hasW4) w4Count++
    if (hasW12) w12Count++

    const lastCompletion = data.last_completion_at
    let lastActiveAt: string | null = null
    if (lastCompletion) {
      lastActiveAt = typeof lastCompletion.toDate === 'function'
        ? (lastCompletion.toDate() as Date).toISOString()
        : String(lastCompletion)
    }

    return {
      id: doc.id,
      memberEmails: coupleMembers.get(doc.id) ?? [],
      status: (data.status as string) ?? 'unknown',
      totalCompletions: data.total_completions ?? completionCount,
      lastActiveAt,
      churnRiskLevel: (data.churn_risk_level as string) ?? null,
    }
  })

  const total = couplesSnap.size
  const age = Math.max(1, weeksBetween(cohortWeek, currentWeek))
  const wmeer = total > 0 ? (totalCompletions / (total * age)) * 100 : 0

  return {
    id: cohortWeek,
    week: cohortWeek,
    startDate: weekToDate(cohortWeek),
    currentWeekNumber: age,
    couplesCount: total,
    activeCount,
    wmeer: Math.round(wmeer * 10) / 10,
    w1Retention: total > 0 ? Math.round((w1Count / total) * 100) : 0,
    w4Retention: total > 0 ? Math.round((w4Count / total) * 100) : 0,
    w12Retention: total > 0 ? Math.round((w12Count / total) * 100) : 0,
    status: cohortStatus(cohortWeek, currentWeek),
    couples,
  }
}

export async function getRetentionHeatmap(): Promise<RetentionCell[]> {
  const currentWeek = getCurrentWeek()

  // Fetch all couples with cohort_week
  const couplesSnap = await adminDb.collection('couples')
    .where('cohort_week', '!=', null)
    .get()

  const cohortCouples = new Map<string, string[]>()
  for (const doc of couplesSnap.docs) {
    const data = doc.data()
    const week = data.cohort_week as string
    if (!week) continue
    const existing = cohortCouples.get(week) ?? []
    existing.push(doc.id)
    cohortCouples.set(week, existing)
  }

  // Fetch all completions
  const completionsSnap = await adminDb.collection('prompt_completions').get()
  const coupleCompletionWeeks = new Map<string, Set<string>>()

  for (const doc of completionsSnap.docs) {
    const data = doc.data()
    const coupleId = data.couple_id as string
    const week = data.week as string
    if (!coupleId || !week) continue

    const existing = coupleCompletionWeeks.get(coupleId) ?? new Set()
    existing.add(week)
    coupleCompletionWeeks.set(coupleId, existing)
  }

  const cells: RetentionCell[] = []

  // For each cohort, compute retention at weeks 1-12
  for (const [cohortWeek, coupleIds] of cohortCouples) {
    const total = coupleIds.length
    if (total === 0) continue

    const maxWeek = Math.min(12, weeksBetween(cohortWeek, currentWeek) + 1)

    for (let weekNum = 1; weekNum <= maxWeek; weekNum++) {
      const targetOffset = weekNum - 1 // week 1 = offset 0

      let activeInWeek = 0
      for (const coupleId of coupleIds) {
        const weeks = coupleCompletionWeeks.get(coupleId)
        if (!weeks) continue

        for (const w of weeks) {
          if (weeksBetween(cohortWeek, w) === targetOffset) {
            activeInWeek++
            break
          }
        }
      }

      cells.push({
        cohort: cohortWeek,
        week: weekNum,
        retention: Math.round((activeInWeek / total) * 100),
      })
    }
  }

  return cells
}
