import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface WmeerSummaryProps {
  currentWmeer: number
  target: number
  week: string
}

export function WmeerSummary({ currentWmeer, target, week }: WmeerSummaryProps) {
  const onTrack = currentWmeer >= target

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WMEER</span>
          <span className="text-sm font-normal text-gray-500">{week}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{currentWmeer}%</span>
          <span className="text-sm text-gray-500 pb-1">/ {target}% target</span>
        </div>
        <Progress value={currentWmeer} className="h-2" />
        <p className={`text-sm font-medium ${onTrack ? 'text-green-600' : 'text-orange-600'}`}>
          {onTrack ? 'On track' : `${target - currentWmeer}% below target`}
        </p>
      </CardContent>
    </Card>
  )
}
