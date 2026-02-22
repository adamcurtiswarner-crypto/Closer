'use client'

import { useState, useEffect } from 'react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

export function NotificationTemplates() {
  const { data: settings } = useSettings()
  const updateMutation = useUpdateSettings()

  const [firstReminder, setFirstReminder] = useState('')
  const [secondReminder, setSecondReminder] = useState('')
  const [completionNotify, setCompletionNotify] = useState('')
  const [chatMessage, setChatMessage] = useState('')

  useEffect(() => {
    if (settings) {
      setFirstReminder(settings.notificationTemplates.firstReminder)
      setSecondReminder(settings.notificationTemplates.secondReminder)
      setCompletionNotify(settings.notificationTemplates.completionNotify)
      setChatMessage(settings.notificationTemplates.chatMessage)
    }
  }, [settings])

  const hasChanges =
    settings &&
    (firstReminder !== settings.notificationTemplates.firstReminder ||
      secondReminder !== settings.notificationTemplates.secondReminder ||
      completionNotify !== settings.notificationTemplates.completionNotify ||
      chatMessage !== settings.notificationTemplates.chatMessage)

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      notificationTemplates: {
        firstReminder,
        secondReminder,
        completionNotify,
        chatMessage,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Templates</CardTitle>
        <CardDescription>
          Customize the push notification copy sent to users. These templates are used by Cloud Functions when delivering notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="first-reminder">First Reminder</Label>
          <p className="text-xs text-gray-500">
            Sent when a user has not responded to their daily prompt after the first interval.
          </p>
          <Textarea
            id="first-reminder"
            value={firstReminder}
            onChange={(e) => setFirstReminder(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="second-reminder">Second Reminder</Label>
          <p className="text-xs text-gray-500">
            Sent as a final reminder before the daily prompt expires.
          </p>
          <Textarea
            id="second-reminder"
            value={secondReminder}
            onChange={(e) => setSecondReminder(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="completion-notify">Completion Notification</Label>
          <p className="text-xs text-gray-500">
            Sent to a user when their partner has submitted a response.
          </p>
          <Textarea
            id="completion-notify"
            value={completionNotify}
            onChange={(e) => setCompletionNotify(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-message">Chat Message</Label>
          <p className="text-xs text-gray-500">
            Sent when a partner sends a chat message. Use {'{name}'} as a placeholder for the sender name.
          </p>
          <Textarea
            id="chat-message"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            <Save />
            {updateMutation.isPending ? 'Saving...' : 'Save Templates'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
