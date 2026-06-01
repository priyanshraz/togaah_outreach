'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0077b6', '#2e86ab', '#48cae4', '#00b4d8', '#90e0ef', '#0096c7'];

interface LeadChartProps {
  data: { sheet: string; count: number }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-800">{payload[0].name}</p>
      <p className="text-[#0077b6] font-semibold">{payload[0].value.toLocaleString()} leads</p>
    </div>
  );
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
              cy="50%"
              outerRadius={85}
              innerRadius={40}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => {
                const item = data.find((d) => d.sheet === value);
                const pct = total > 0 && item ? Math.round((item.count / total) * 100) : 0;
                return (
                  <span className="text-xs text-gray-700">
                    {value.replace(' Leads', '')} <span className="text-gray-400">({pct}%)</span>
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
