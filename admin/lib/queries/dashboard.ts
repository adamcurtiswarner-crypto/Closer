import { adminDb } from '@/lib/firebase-admin'

export interface DashboardMetrics {
  activeCouples: number
  activeCouplesDelta: number
  completionsThisWeek: number
  completionsDelta: number
  completionRate: number
  completionRateDelta: number
  d7Retention: number
  d7RetentionDelta: number
  currentWmeer: number
  wmeerTarget: number
  currentWeek: string
}

export interface WmeerTrend {
  week: string
  wmeer: number
}

export interface Alert {
  type: 'danger' | 'warning' | 'success'
  message: string
  link?: string
}

function getCurrentWeek(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 604800000
  const weekNum = Math.ceil((diff / oneWeek) + start.getDay() / 7)
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getPreviousWeek(week: string): string {
  const [year, w] = week.split('-W').map(Number)
  if (w === 1) return `${year - 1}-W52`
  return `${year}-W${String(w - 1).padStart(2, '0')}`
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const currentWeek = getCurrentWeek()
  const previousWeek = getPreviousWeek(currentWeek)

  // Active couples
  const couplesSnap = await adminDb.collection('couples')
    .where('status', '==', 'active').get()
  const activeCouples = couplesSnap.size

  // This week's completions
  const thisWeekSnap = await adminDb.collection('prompt_completions')
    .where('week', '==', currentWeek).get()
  const completionsThisWeek = thisWeekSnap.size

  // Last week's completions for delta
  const lastWeekSnap = await adminDb.collection('prompt_completions')
    .where('week', '==', previousWeek).get()
  const completionsLastWeek = lastWeekSnap.size

  // This week's assignments for completion rate
  const assignmentsSnap = await adminDb.collection('prompt_assignments')
    .where('assigned_date', '>=', currentWeek).get()
  const completionRate = assignmentsSnap.size > 0
    ? (completionsThisWeek / assignmentsSnap.size) * 100
    : 0

  // WMEER from metrics collection
  const wmeerSnap = await adminDb.collection('admin_state')
    .doc('metrics').get()
  const metricsData = wmeerSnap.data()
  const currentWmeer = metricsData?.current_wmeer ?? 0

  return {
    activeCouples,
    activeCouplesDelta: 0,
    completionsThisWeek,
    completionsDelta: completionsThisWeek - completionsLastWeek,
    completionRate: Math.round(completionRate),
    completionRateDelta: 0,
    d7Retention: metricsData?.d7_retention ?? 0,
    d7RetentionDelta: 0,
    currentWmeer: Math.round(currentWmeer * 100),
    wmeerTarget: 50,
    currentWeek,
  }
}

export async function getWmeerTrend(): Promise<WmeerTrend[]> {
  const snap = await adminDb.collection('admin_state')
    .where('type', '==', 'wmeer_weekly')
    .orderBy('week', 'desc')
    .limit(12)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    return {
      week: data.week,
      wmeer: Math.round((data.wmeer ?? 0) * 100),
    }
  }).reverse()
}

export async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []

  // Flagged prompts: fetch by status + times_assigned, filter completion_rate in JS
  // (Firestore doesn't support compound inequality on different fields without composite index)
  const lowPerf = await adminDb.collection('prompts')
    .where('status', 'in', ['active', 'testing'])
    .where('times_assigned', '>=', 10)
    .get()

  lowPerf.docs.forEach(doc => {
    const data = doc.data()
    if (data.completion_rate < 0.3) {
      alerts.push({
        type: 'danger',
        message: `"${data.text?.substring(0, 40)}..." has ${Math.round(data.completion_rate * 100)}% completion`,
        link: `/prompts?id=${doc.id}`,
      })
    }
  })

  // Ready to graduate (testing prompts with high completion)
  const testingSnap = await adminDb.collection('prompts')
    .where('status', '==', 'testing')
    .where('times_assigned', '>=', 10)
    .get()

  testingSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.completion_rate > 0.75) {
      alerts.push({
        type: 'success',
        message: `"${data.text?.substring(0, 40)}..." ready to graduate (${Math.round(data.completion_rate * 100)}%)`,
        link: `/prompts?id=${doc.id}`,
      })
    }
  })

  // High churn couples
  const churnSnap = await adminDb.collection('couples')
    .where('status', '==', 'active')
    .where('churn_risk_level', '==', 'high')
    .get()

  if (churnSnap.size > 0) {
    alerts.push({
      type: 'warning',
      message: `${churnSnap.size} couple${churnSnap.size > 1 ? 's' : ''} at high churn risk`,
      link: '/cohorts',
    })
  }

  return alerts
}
