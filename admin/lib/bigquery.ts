import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID,
})

export const DATASET = 'stoke_analytics'
export const EVENTS_TABLE = 'events'

export async function queryBigQuery<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
  const [rows] = await bigquery.query({ query, params })
  return rows as T[]
}

export default bigquery
