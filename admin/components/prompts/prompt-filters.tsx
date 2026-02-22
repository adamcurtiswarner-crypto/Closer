'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'testing', label: 'Testing' },
  { value: 'draft', label: 'Draft' },
  { value: 'retired', label: 'Retired' },
  { value: 'flagged', label: 'Flagged' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'love_map_update', label: 'Love Map Update' },
  { value: 'conflict_navigation', label: 'Conflict Navigation' },
  { value: 'bid_for_connection', label: 'Bid for Connection' },
  { value: 'appreciation_expression', label: 'Appreciation Expression' },
  { value: 'dream_exploration', label: 'Dream Exploration' },
  { value: 'repair_attempt', label: 'Repair Attempt' },
]

const DEPTH_OPTIONS = [
  { value: 'all', label: 'All Depths' },
  { value: 'surface', label: 'Surface' },
  { value: 'medium', label: 'Medium' },
  { value: 'deep', label: 'Deep' },
]

export interface PromptFilters {
  status?: string
  type?: string
  depth?: string
  search?: string
}

interface PromptFiltersProps {
  filters: PromptFilters
  onFilterChange: (filters: PromptFilters) => void
  onCreateClick: () => void
}

export function PromptFiltersBar({ filters, onFilterChange, onCreateClick }: PromptFiltersProps) {
  function updateFilter(key: keyof PromptFilters, value: string) {
    const next = { ...filters }
    if (value === 'all' || value === '') {
      delete next[key]
    } else {
      next[key] = value
    }
    onFilterChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => updateFilter('status', v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type ?? 'all'}
        onValueChange={(v) => updateFilter('type', v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.depth ?? 'all'}
        onValueChange={(v) => updateFilter('depth', v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Depth" />
        </SelectTrigger>
        <SelectContent>
          {DEPTH_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search prompts..."
          className="pl-9"
          value={filters.search ?? ''}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      <Button onClick={onCreateClick} style={{ backgroundColor: '#c97454' }}>
        <Plus />
        New Prompt
      </Button>
    </div>
  )
}
