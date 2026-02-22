'use client'

import { useState, useEffect } from 'react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

export function KillThresholds() {
  const { data: settings } = useSettings()
  const updateMutation = useUpdateSettings()

  const [autoRetireRate, setAutoRetireRate] = useState(30)
  const [autoRetireMinAssignments, setAutoRetireMinAssignments] = useState(10)
  const [autoPromoteRate, setAutoPromoteRate] = useState(75)
  const [autoPromoteMinAssignments, setAutoPromoteMinAssignments] = useState(10)
  const [autoPromotePositiveRate, setAutoPromotePositiveRate] = useState(60)

  useEffect(() => {
    if (settings) {
      setAutoRetireRate(settings.thresholds.autoRetireRate)
      setAutoRetireMinAssignments(settings.thresholds.autoRetireMinAssignments)
      setAutoPromoteRate(settings.thresholds.autoPromoteRate)
      setAutoPromoteMinAssignments(settings.thresholds.autoPromoteMinAssignments)
      setAutoPromotePositiveRate(settings.thresholds.autoPromotePositiveRate)
    }
  }, [settings])

  const hasChanges =
    settings &&
    (autoRetireRate !== settings.thresholds.autoRetireRate ||
      autoRetireMinAssignments !== settings.thresholds.autoRetireMinAssignments ||
      autoPromoteRate !== settings.thresholds.autoPromoteRate ||
      autoPromoteMinAssignments !== settings.thresholds.autoPromoteMinAssignments ||
      autoPromotePositiveRate !== settings.thresholds.autoPromotePositiveRate)

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      thresholds: {
        autoRetireRate,
        autoRetireMinAssignments,
        autoPromoteRate,
        autoPromoteMinAssignments,
        autoPromotePositiveRate,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Graduation Thresholds</CardTitle>
        <CardDescription>
          These thresholds control the automatic promotion and retirement of prompts.
          The scheduled <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">graduatePrompts</code> function
          uses these values to decide which prompts move from testing to active, and which get retired.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Auto-Retire (Poor Performers)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Prompts in testing status are automatically retired if their completion rate falls below this threshold
            after enough assignments.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retire-rate">Completion Rate Below (%)</Label>
              <Input
                id="retire-rate"
                type="number"
                min={0}
                max={100}
                value={autoRetireRate}
                onChange={(e) => setAutoRetireRate(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retire-min">Min Assignments Required</Label>
              <Input
                id="retire-min"
                type="number"
                min={1}
                value={autoRetireMinAssignments}
                onChange={(e) => setAutoRetireMinAssignments(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Auto-Promote (Strong Performers)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Prompts in testing status are automatically promoted to active if they meet both the completion rate
            and positive response rate thresholds after enough assignments.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promote-rate">Completion Rate Above (%)</Label>
              <Input
                id="promote-rate"
                type="number"
                min={0}
                max={100}
                value={autoPromoteRate}
                onChange={(e) => setAutoPromoteRate(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-min">Min Assignments Required</Label>
              <Input
                id="promote-min"
                type="number"
                min={1}
                value={autoPromoteMinAssignments}
                onChange={(e) => setAutoPromoteMinAssignments(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-positive">Positive Rate Above (%)</Label>
              <Input
                id="promote-positive"
                type="number"
                min={0}
                max={100}
                value={autoPromotePositiveRate}
                onChange={(e) => setAutoPromotePositiveRate(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            <Save />
            {updateMutation.isPending ? 'Saving...' : 'Save Thresholds'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
