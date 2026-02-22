'use client'

import { useMemo } from 'react'
import { usePrompts, useUpdatePrompt } from '@/hooks/usePrompts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { PromptRow } from '@/lib/queries/prompts'

function PromptItem({
  prompt,
  actions,
}: {
  prompt: PromptRow
  actions: React.ReactNode
}) {
  const ratePercent = Math.round(prompt.completion_rate * 100)

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug truncate">{prompt.text}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-xs">
            {ratePercent}% completion
          </Badge>
          <span className="text-xs text-gray-400">
            {prompt.times_assigned} assignments
          </span>
          {prompt.ai_generated && (
            <Badge variant="secondary" className="text-xs">AI</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {actions}
      </div>
    </div>
  )
}

export function PromptReviewStep() {
  const { data: prompts, isLoading } = usePrompts()
  const updatePrompt = useUpdatePrompt()

  const { retire, graduate, rewrite } = useMemo(() => {
    if (!prompts) return { retire: [], graduate: [], rewrite: [] }

    const retire: PromptRow[] = []
    const graduate: PromptRow[] = []
    const rewrite: PromptRow[] = []

    for (const p of prompts) {
      if (p.status === 'retired') continue

      const rate = p.completion_rate
      const assigned = p.times_assigned

      // Low performers with enough data: < 30% after 10+ assignments
      if (assigned >= 10 && rate < 0.3 && (p.status === 'active' || p.status === 'testing')) {
        retire.push(p)
        continue
      }

      // Testing prompts ready to graduate: > 75% completion
      if (p.status === 'testing' && assigned >= 10 && rate > 0.75) {
        graduate.push(p)
        continue
      }

      // Underperformers worth rewriting: 30-50% completion
      if (assigned >= 10 && rate >= 0.3 && rate <= 0.5 && (p.status === 'active' || p.status === 'testing')) {
        rewrite.push(p)
      }
    }

    return { retire, graduate, rewrite }
  }, [prompts])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading prompts...</div>
  }

  const isEmpty = retire.length === 0 && graduate.length === 0 && rewrite.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Prompt Review</h3>
        <p className="text-sm text-gray-500 mt-1">
          Review prompt performance and take action on outliers.
        </p>
      </div>

      {isEmpty && (
        <Card>
          <CardContent className="pt-4 text-center text-sm text-gray-500">
            No prompts need attention this week. All prompts are performing within normal ranges.
          </CardContent>
        </Card>
      )}

      {/* Retire section */}
      {retire.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">Retire</span>
              <Badge variant="destructive" className="ml-auto">{retire.length}</Badge>
            </CardTitle>
            <p className="text-xs text-gray-500">
              Below 30% completion after 10+ assignments
            </p>
          </CardHeader>
          <CardContent>
            {retire.map((p, i) => (
              <div key={p.id}>
                {i > 0 && <Separator />}
                <PromptItem
                  prompt={p}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatePrompt.isPending}
                        onClick={() => updatePrompt.mutate({ id: p.id, status: 'retired' })}
                      >
                        Retire
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatePrompt.isPending}
                        onClick={() => updatePrompt.mutate({ id: p.id, status: 'draft' })}
                      >
                        Rewrite
                      </Button>
                    </>
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Graduate section */}
      {graduate.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-700">Graduate</span>
              <Badge className="ml-auto bg-green-100 text-green-800">{graduate.length}</Badge>
            </CardTitle>
            <p className="text-xs text-gray-500">
              Testing prompts above 75% completion — ready to promote
            </p>
          </CardHeader>
          <CardContent>
            {graduate.map((p, i) => (
              <div key={p.id}>
                {i > 0 && <Separator />}
                <PromptItem
                  prompt={p}
                  actions={
                    <Button
                      size="sm"
                      disabled={updatePrompt.isPending}
                      onClick={() => updatePrompt.mutate({ id: p.id, status: 'active' })}
                    >
                      Promote to Active
                    </Button>
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rewrite section */}
      {rewrite.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-700">Rewrite</span>
              <Badge className="ml-auto bg-yellow-100 text-yellow-800">{rewrite.length}</Badge>
            </CardTitle>
            <p className="text-xs text-gray-500">
              30-50% completion — could improve with edits
            </p>
          </CardHeader>
          <CardContent>
            {rewrite.map((p, i) => (
              <div key={p.id}>
                {i > 0 && <Separator />}
                <PromptItem
                  prompt={p}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatePrompt.isPending}
                        onClick={() => updatePrompt.mutate({ id: p.id, status: 'draft' })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatePrompt.isPending}
                        onClick={() => updatePrompt.mutate({ id: p.id, status: 'retired' })}
                      >
                        Retire
                      </Button>
                    </>
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
