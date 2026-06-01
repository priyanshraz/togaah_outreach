'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0077b6', '#2e86ab', '#48cae4', '#00b4d8', '#90e0ef', '#0096c7'];

interface LeadChartProps {
  data: { sheet: string; count: number }[];
}

export function LeadChart({ data }: LeadChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads by Sheet</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="sheet"
              cx="50%"
              cy="45%"
              outerRadius={80}
              innerRadius={35}
              paddingAngle={2}
              isAnimationActive={false}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value: string) => {
                const item = data.find((d) => d.sheet === value);
                const pct = total > 0 && item ? Math.round((item.count / total) * 100) : 0;
                return `${value.replace(' Leads', '')} (${pct}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
