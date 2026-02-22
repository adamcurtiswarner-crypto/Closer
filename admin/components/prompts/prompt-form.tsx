'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PromptDetail } from '@/lib/queries/prompts'
import { useCreatePrompt, useUpdatePrompt } from '@/hooks/usePrompts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const PROMPT_TYPES = [
  { value: 'love_map_update', label: 'Love Map Update' },
  { value: 'conflict_navigation', label: 'Conflict Navigation' },
  { value: 'bid_for_connection', label: 'Bid for Connection' },
  { value: 'appreciation_expression', label: 'Appreciation Expression' },
  { value: 'dream_exploration', label: 'Dream Exploration' },
  { value: 'repair_attempt', label: 'Repair Attempt' },
]

const RESEARCH_OPTIONS = [
  { value: 'gottman_sound_house', label: 'Gottman Sound House' },
  { value: 'four_horsemen_prevention', label: 'Four Horsemen Prevention' },
  { value: 'repair_attempts', label: 'Repair Attempts' },
  { value: 'turning_toward', label: 'Turning Toward' },
  { value: 'original', label: 'Original' },
]

const DEPTH_OPTIONS = [
  { value: 'surface', label: 'Surface' },
  { value: 'medium', label: 'Medium' },
  { value: 'deep', label: 'Deep' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface PromptFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editPrompt?: PromptDetail
}

export function PromptForm({ open, onOpenChange, editPrompt }: PromptFormProps) {
  const createMutation = useCreatePrompt()
  const updateMutation = useUpdatePrompt()
  const isEdit = !!editPrompt

  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [type, setType] = useState('love_map_update')
  const [researchBasis, setResearchBasis] = useState('original')
  const [emotionalDepth, setEmotionalDepth] = useState('medium')
  const [requiresConversation, setRequiresConversation] = useState(false)
  const [weekRestriction, setWeekRestriction] = useState('')
  const [maxPerWeek, setMaxPerWeek] = useState('')
  const [preferredDays, setPreferredDays] = useState<number[]>([])
  const [status, setStatus] = useState<'draft' | 'testing'>('draft')

  // Reset form when dialog opens or editPrompt changes
  useEffect(() => {
    if (open) {
      if (editPrompt) {
        setText(editPrompt.text)
        setHint(editPrompt.hint ?? '')
        setType(editPrompt.type)
        setResearchBasis(editPrompt.research_basis)
        setEmotionalDepth(editPrompt.emotional_depth)
        setRequiresConversation(editPrompt.requires_conversation)
        setWeekRestriction(editPrompt.week_restriction?.toString() ?? '')
        setMaxPerWeek(editPrompt.max_per_week?.toString() ?? '')
        setPreferredDays(editPrompt.day_preference ?? [])
        setStatus(editPrompt.status === 'testing' ? 'testing' : 'draft')
      } else {
        setText('')
        setHint('')
        setType('love_map_update')
        setResearchBasis('original')
        setEmotionalDepth('medium')
        setRequiresConversation(false)
        setWeekRestriction('')
        setMaxPerWeek('')
        setPreferredDays([])
        setStatus('draft')
      }
    }
  }, [open, editPrompt])

  const wordCount = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).length
  }, [text])

  function toggleDay(index: number) {
    setPreferredDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index].sort()
    )
  }

  async function handleSubmit(submitStatus: 'draft' | 'testing') {
    const payload: Record<string, unknown> = {
      text: text.trim(),
      hint: hint.trim() || undefined,
      type,
      research_basis: researchBasis,
      emotional_depth: emotionalDepth,
      requires_conversation: requiresConversation,
      week_restriction: weekRestriction ? parseInt(weekRestriction, 10) : null,
      max_per_week: maxPerWeek ? parseInt(maxPerWeek, 10) : null,
      day_preference: preferredDays.length > 0 ? preferredDays : null,
      status: submitStatus,
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: editPrompt.id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    onOpenChange(false)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isValid = text.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Prompt' : 'Create Prompt'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the prompt details below.' : 'Write a new prompt for couples.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Prompt text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt-text">Prompt Text</Label>
              <span className={`text-xs ${wordCount > 15 ? 'text-red-500' : 'text-gray-400'}`}>
                {wordCount} word{wordCount !== 1 ? 's' : ''} (target: 15 or fewer)
              </span>
            </div>
            <Textarea
              id="prompt-text"
              placeholder="What is one thing your partner did this week that made you feel appreciated?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Hint */}
          <div className="space-y-2">
            <Label htmlFor="prompt-hint">Hint (optional)</Label>
            <Input
              id="prompt-hint"
              placeholder="Think about a specific moment..."
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          {/* Type + Research + Depth row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Research Basis</Label>
              <Select value={researchBasis} onValueChange={setResearchBasis}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Emotional Depth</Label>
              <Select value={emotionalDepth} onValueChange={setEmotionalDepth}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTH_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requires conversation */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="requires-conversation"
              checked={requiresConversation}
              onCheckedChange={(checked) => setRequiresConversation(checked === true)}
            />
            <Label htmlFor="requires-conversation" className="text-sm font-normal">
              Requires in-person conversation
            </Label>
          </div>

          <Separator />

          {/* Scheduling section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Scheduling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="week-restriction">Week Restriction</Label>
                <Input
                  id="week-restriction"
                  type="number"
                  min={1}
                  placeholder="e.g. 4"
                  value={weekRestriction}
                  onChange={(e) => setWeekRestriction(e.target.value)}
                />
                <p className="text-xs text-gray-400">Only assign after this many weeks</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-per-week">Max Per Week</Label>
                <Input
                  id="max-per-week"
                  type="number"
                  min={1}
                  placeholder="e.g. 2"
                  value={maxPerWeek}
                  onChange={(e) => setMaxPerWeek(e.target.value)}
                />
                <p className="text-xs text-gray-400">Limit how often this is assigned per week</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Days</Label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      preferredDays.includes(i)
                        ? 'border-[#c97454] bg-orange-50 text-[#c97454]'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label>Initial Status</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="accent-[#c97454]"
                />
                <span className="text-sm">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="testing"
                  checked={status === 'testing'}
                  onChange={() => setStatus('testing')}
                  className="accent-[#c97454]"
                />
                <span className="text-sm">Testing</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={!isValid || isSaving}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit('testing')}
            disabled={!isValid || isSaving}
            style={{ backgroundColor: '#c97454' }}
          >
            {isSaving ? 'Saving...' : 'Save & Start Testing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
