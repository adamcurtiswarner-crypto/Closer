/**
 * Setup script for BigQuery analytics export.
 * Creates the stoke_analytics dataset and events table.
 *
 * Usage: npm run setup:bigquery
 */

import { BigQuery } from '@google-cloud/bigquery';

const DATASET_ID = 'stoke_analytics';
const TABLE_ID = 'events';

const EVENTS_SCHEMA = [
  { name: 'id', type: 'STRING', mode: 'REQUIRED' as const },
  { name: 'event_name', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'user_id', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'couple_id', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'properties', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'platform', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'app_version', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'session_id', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' as const },
  { name: 'date', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'week', type: 'STRING', mode: 'NULLABLE' as const },
  { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' as const },
];

async function setup() {
  const bigquery = new BigQuery();

  // Create dataset
  try {
    const [dataset] = await bigquery.createDataset(DATASET_ID, {
      location: 'US',
    });
    console.log(`Dataset ${dataset.id} created.`);
  } catch (err: any) {
    if (err.code === 409) {
      console.log(`Dataset ${DATASET_ID} already exists.`);
    } else {
      throw err;
    }
  }

  // Create table
  try {
    const [table] = await bigquery.dataset(DATASET_ID).createTable(TABLE_ID, {
      schema: { fields: EVENTS_SCHEMA },
      timePartitioning: {
        type: 'DAY',
        field: 'timestamp',
      },
    });
    console.log(`Table ${table.id} created.`);
  } catch (err: any) {
    if (err.code === 409) {
      console.log(`Table ${TABLE_ID} already exists.`);
    } else {
      throw err;
    }
  }

  console.log('BigQuery setup complete.');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
