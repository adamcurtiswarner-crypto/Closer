import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert as AlertUI, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Alert {
  type: 'danger' | 'warning' | 'success'
  message: string
  link?: string
}

const iconMap = {
  danger: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
}

const colorMap = {
  danger: 'text-red-600',
  warning: 'text-yellow-600',
  success: 'text-green-600',
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No alerts right now.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => {
          const Icon = iconMap[alert.type]
          const content = (
            <AlertUI key={i} className="py-2">
              <AlertDescription className="flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${colorMap[alert.type]}`} />
                <span className="text-sm">{alert.message}</span>
              </AlertDescription>
            </AlertUI>
          )
          return alert.link ? <Link key={i} href={alert.link}>{content}</Link> : content
        })}
      </CardContent>
    </Card>
  )
}
