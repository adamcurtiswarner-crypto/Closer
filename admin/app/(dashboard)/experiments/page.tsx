'use client'

import { useState, useCallback } from 'react'
import { useExperiments, useUpdateExperiment, useCreateExperiment } from '@/hooks/useExperiments'
import { ExperimentsTable, type ExperimentAction } from '@/components/experiments/experiments-table'
import { ExperimentResults } from '@/components/experiments/experiment-results'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'

export default function ExperimentsPage() {
  const { data: experiments, isLoading } = useExperiments()
  const updateMutation = useUpdateExperiment()
  const createMutation = useCreateExperiment()

  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // New experiment form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<'ab_test' | 'feature_flag'>('ab_test')
  const [newTarget, setNewTarget] = useState('50')
  const [newMetric, setNewMetric] = useState('')

  const resetForm = useCallback(() => {
    setNewName('')
    setNewDescription('')
    setNewType('ab_test')
    setNewTarget('50')
    setNewMetric('')
  }, [])

  const handleAction = useCallback(
    async (id: string, action: ExperimentAction) => {
      switch (action) {
        case 'view_results':
          setSelectedExperimentId(id)
          break
        case 'pause':
          await updateMutation.mutateAsync({ id, status: 'paused' })
          break
        case 'resume':
          await updateMutation.mutateAsync({ id, status: 'running' })
          break
        case 'end':
          await updateMutation.mutateAsync({ id, status: 'completed' })
          break
      }
    },
    [updateMutation]
  )

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return

    await createMutation.mutateAsync({
      name: newName.trim(),
      description: newDescription.trim(),
      type: newType,
      targetPercentage: parseInt(newTarget, 10) || 50,
      primaryMetric: newMetric.trim(),
    })

    resetForm()
    setCreateDialogOpen(false)
  }, [newName, newDescription, newType, newTarget, newMetric, createMutation, resetForm])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Experiments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {experiments
              ? `${experiments.length} experiment${experiments.length !== 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus />
          New Experiment
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading experiments...</div>
      ) : (
        <ExperimentsTable
          experiments={experiments ?? []}
          selectedId={selectedExperimentId}
          onSelectExperiment={setSelectedExperimentId}
          onAction={handleAction}
        />
      )}

      {selectedExperimentId && (
        <ExperimentResults
          experimentId={selectedExperimentId}
          onClose={() => setSelectedExperimentId(null)}
        />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Experiment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="exp-name">Name</Label>
              <Input
                id="exp-name"
                placeholder="e.g., Prompt frequency test"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-desc">Description</Label>
              <Input
                id="exp-desc"
                placeholder="What are you testing?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as 'ab_test' | 'feature_flag')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ab_test">A/B Test</SelectItem>
                    <SelectItem value="feature_flag">Feature Flag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-target">Target %</Label>
                <Input
                  id="exp-target"
                  type="number"
                  min={1}
                  max={100}
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-metric">Primary Metric</Label>
              <Input
                id="exp-metric"
                placeholder="e.g., completion_rate"
                value={newMetric}
                onChange={(e) => setNewMetric(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm()
                  setCreateDialogOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Experiment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
