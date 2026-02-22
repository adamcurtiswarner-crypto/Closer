import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  return (
    <div className="flex gap-3">
      <Button variant="outline" asChild>
        <Link href="/prompts?status=flagged">Review flagged prompts</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/cohorts">View cohort details</Link>
      </Button>
    </div>
  )
}
