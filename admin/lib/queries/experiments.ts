import { adminDb } from '@/lib/firebase-admin'
import admin from '@/lib/firebase-admin'

export interface ExperimentRow {
  id: string
  name: string
  description: string
  type: 'ab_test' | 'feature_flag'
  status: 'draft' | 'running' | 'paused' | 'completed'
  targetPercentage: number
  startedAt: string | null
  createdAt: string
}

export interface ExperimentDetail extends ExperimentRow {
  variants: { name: string; weight: number }[]
  primaryMetric: string
  secondaryMetrics: string[]
  results?: ExperimentResults
}

export interface ExperimentResults {
  control: { name: string; metric: number; sampleSize: number }
  treatment: { name: string; metric: number; sampleSize: number }
  significance: number
  recommendation: 'roll_out' | 'keep_testing' | 'kill'
}

export async function getExperiments(): Promise<ExperimentRow[]> {
  const snap = await adminDb.collection('experiments')
    .orderBy('created_at', 'desc')
    .get()

  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      name: d.name ?? '',
      description: d.description ?? '',
      type: d.type ?? 'ab_test',
      status: d.status ?? 'draft',
      targetPercentage: d.target_percentage ?? 50,
      startedAt: d.started_at?.toDate?.()?.toISOString() ?? null,
      createdAt: d.created_at?.toDate?.()?.toISOString() ?? '',
    }
  })
}

export async function getExperimentById(id: string): Promise<ExperimentDetail | null> {
  const doc = await adminDb.collection('experiments').doc(id).get()
  if (!doc.exists) return null

  const d = doc.data()!

  // Compute results from assignments subcollection
  const assignmentsSnap = await adminDb
    .collection('experiments')
    .doc(id)
    .collection('assignments')
    .get()

  let results: ExperimentResults | undefined

  if (!assignmentsSnap.empty) {
    const variants = (d.variants as { name: string; weight: number }[]) ?? [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 },
    ]

    // Group assignments by variant and compute metrics
    const variantStats = new Map<string, { metricSum: number; count: number }>()

    for (const aDoc of assignmentsSnap.docs) {
      const aData = aDoc.data()
      const variant = (aData.variant as string) ?? 'control'
      const metric = (aData.metric_value as number) ?? 0

      const existing = variantStats.get(variant) ?? { metricSum: 0, count: 0 }
      existing.metricSum += metric
      existing.count++
      variantStats.set(variant, existing)
    }

    const controlName = variants[0]?.name ?? 'control'
    const treatmentName = variants[1]?.name ?? 'treatment'

    const controlStats = variantStats.get(controlName) ?? { metricSum: 0, count: 0 }
    const treatmentStats = variantStats.get(treatmentName) ?? { metricSum: 0, count: 0 }

    const controlMetric = controlStats.count > 0 ? controlStats.metricSum / controlStats.count : 0
    const treatmentMetric = treatmentStats.count > 0 ? treatmentStats.metricSum / treatmentStats.count : 0

    // Simple significance estimation based on sample size and effect size
    const totalSample = controlStats.count + treatmentStats.count
    const effectSize = controlMetric > 0 ? Math.abs(treatmentMetric - controlMetric) / controlMetric : 0
    const significance = Math.min(99, Math.round(effectSize * totalSample * 10))

    let recommendation: 'roll_out' | 'keep_testing' | 'kill' = 'keep_testing'
    if (significance >= 95 && treatmentMetric > controlMetric) {
      recommendation = 'roll_out'
    } else if (significance >= 95 && treatmentMetric < controlMetric) {
      recommendation = 'kill'
    }

    results = {
      control: {
        name: controlName,
        metric: Math.round(controlMetric * 1000) / 1000,
        sampleSize: controlStats.count,
      },
      treatment: {
        name: treatmentName,
        metric: Math.round(treatmentMetric * 1000) / 1000,
        sampleSize: treatmentStats.count,
      },
      significance,
      recommendation,
    }
  }

  return {
    id: doc.id,
    name: d.name ?? '',
    description: d.description ?? '',
    type: d.type ?? 'ab_test',
    status: d.status ?? 'draft',
    targetPercentage: d.target_percentage ?? 50,
    startedAt: d.started_at?.toDate?.()?.toISOString() ?? null,
    createdAt: d.created_at?.toDate?.()?.toISOString() ?? '',
    variants: d.variants ?? [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 },
    ],
    primaryMetric: d.primary_metric ?? '',
    secondaryMetrics: d.secondary_metrics ?? [],
    results,
  }
}

export async function updateExperimentStatus(
  id: string,
  status: 'running' | 'paused' | 'completed'
) {
  const now = admin.firestore.FieldValue.serverTimestamp()
  const updateData: Record<string, unknown> = {
    status,
    updated_at: now,
  }

  if (status === 'running') {
    // Only set started_at if it hasn't been set yet
    const doc = await adminDb.collection('experiments').doc(id).get()
    if (doc.exists && !doc.data()?.started_at) {
      updateData.started_at = now
    }
  }

  if (status === 'completed') {
    updateData.completed_at = now
  }

  await adminDb.collection('experiments').doc(id).update(updateData)
}

export async function createExperiment(fields: {
  name: string
  description: string
  type: 'ab_test' | 'feature_flag'
  targetPercentage: number
  variants?: { name: string; weight: number }[]
  primaryMetric?: string
  secondaryMetrics?: string[]
}) {
  const now = admin.firestore.FieldValue.serverTimestamp()
  const ref = await adminDb.collection('experiments').add({
    name: fields.name,
    description: fields.description,
    type: fields.type,
    status: 'draft',
    target_percentage: fields.targetPercentage,
    variants: fields.variants ?? [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 },
    ],
    primary_metric: fields.primaryMetric ?? '',
    secondary_metrics: fields.secondaryMetrics ?? [],
    created_at: now,
    updated_at: now,
    started_at: null,
    completed_at: null,
  })
  return ref.id
}
