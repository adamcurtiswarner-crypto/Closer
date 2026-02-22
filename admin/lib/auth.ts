import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    if (decoded.email !== process.env.ADMIN_EMAIL) return null
    return decoded
  } catch {
    return null
  }
}
