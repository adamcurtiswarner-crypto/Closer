import { adminDb } from '@/lib/firebase-admin'
import admin from '@/lib/firebase-admin'

export interface AppSettings {
  notificationTemplates: {
    firstReminder: string
    secondReminder: string
    completionNotify: string
    chatMessage: string
  }
  thresholds: {
    autoRetireRate: number
    autoRetireMinAssignments: number
    autoPromoteRate: number
    autoPromoteMinAssignments: number
    autoPromotePositiveRate: number
  }
}

export async function getSettings(): Promise<AppSettings> {
  const doc = await adminDb.collection('admin_state').doc('settings').get()
  const data = doc.data()

  return {
    notificationTemplates: {
      firstReminder: data?.notification_templates?.first_reminder ?? 'Your daily prompt is waiting. Take a moment to connect.',
      secondReminder: data?.notification_templates?.second_reminder ?? 'Last chance to respond to today\'s prompt before it expires.',
      completionNotify: data?.notification_templates?.completion_notify ?? 'Your partner has responded. See what they shared.',
      chatMessage: data?.notification_templates?.chat_message ?? '{name} sent you a message.',
    },
    thresholds: {
      autoRetireRate: data?.thresholds?.auto_retire_rate ?? 30,
      autoRetireMinAssignments: data?.thresholds?.auto_retire_min_assignments ?? 10,
      autoPromoteRate: data?.thresholds?.auto_promote_rate ?? 75,
      autoPromoteMinAssignments: data?.thresholds?.auto_promote_min_assignments ?? 10,
      autoPromotePositiveRate: data?.thresholds?.auto_promote_positive_rate ?? 60,
    },
  }
}

export async function updateSettings(settings: Partial<AppSettings>) {
  const now = admin.firestore.FieldValue.serverTimestamp()
  const updateData: Record<string, unknown> = { updated_at: now }

  if (settings.notificationTemplates) {
    updateData.notification_templates = {
      first_reminder: settings.notificationTemplates.firstReminder,
      second_reminder: settings.notificationTemplates.secondReminder,
      completion_notify: settings.notificationTemplates.completionNotify,
      chat_message: settings.notificationTemplates.chatMessage,
    }
  }

  if (settings.thresholds) {
    updateData.thresholds = {
      auto_retire_rate: settings.thresholds.autoRetireRate,
      auto_retire_min_assignments: settings.thresholds.autoRetireMinAssignments,
      auto_promote_rate: settings.thresholds.autoPromoteRate,
      auto_promote_min_assignments: settings.thresholds.autoPromoteMinAssignments,
      auto_promote_positive_rate: settings.thresholds.autoPromotePositiveRate,
    }
  }

  await adminDb.collection('admin_state').doc('settings').set(updateData, { merge: true })
}

export async function exportAllData() {
  const [users, couples, prompts, completions] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('couples').get(),
    adminDb.collection('prompts').get(),
    adminDb.collection('prompt_completions').orderBy('completed_at', 'desc').limit(1000).get(),
  ])

  return {
    users: users.docs.map(d => ({ id: d.id, ...d.data() })),
    couples: couples.docs.map(d => ({ id: d.id, ...d.data() })),
    prompts: prompts.docs.map(d => ({ id: d.id, ...d.data() })),
    completions: completions.docs.map(d => ({ id: d.id, ...d.data() })),
    exportedAt: new Date().toISOString(),
  }
}
