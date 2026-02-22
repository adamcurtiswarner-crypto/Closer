'use client'

import { useExportData } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function DataExport() {
  const exportMutation = useExportData()

  const handleExport = async () => {
    const blob = await exportMutation.mutateAsync()
    const url = URL.createObjectURL(blob)
    const date = new Date().toISOString().split('T')[0]

    const a = document.createElement('a')
    a.href = url
    a.download = `stoke-export-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Download a full JSON export of all users, couples, prompts, and recent completions.
          This includes the most recent 1,000 completions. The export can be used for offline
          analysis, backups, or migration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          variant="outline"
        >
          <Download />
          {exportMutation.isPending ? 'Preparing export...' : 'Download Export'}
        </Button>

        {exportMutation.isError && (
          <p className="text-sm text-red-600 mt-3">
            Export failed. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
