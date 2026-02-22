'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface WmeerChartProps {
  data: { week: string; wmeer: number }[]
  target: number
}

export function WmeerChart({ data, target }: WmeerChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WMEER Trend (12 weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="3 3" label="Target" />
            <Line type="monotone" dataKey="wmeer" stroke="#c97454" strokeWidth={2} dot={{ fill: '#c97454' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
