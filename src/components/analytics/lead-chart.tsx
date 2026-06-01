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
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', pointerEvents: 'none' }}>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a202c' }}>{payload[0].name}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#0077b6', fontWeight: 700 }}>{payload[0].value.toLocaleString()} leads</p>
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
      {/* overflow-visible so tooltip never gets clipped by container */}
      <CardContent style={{ overflow: 'visible' }}>
        <div style={{ width: '100%', height: 260, overflow: 'visible' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ overflow: 'visible' }}>
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
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none', border: 'none', zIndex: 50, overflow: 'visible' }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                formatter={(value: string) => {
                  const item = data.find((d) => d.sheet === value);
                  const pct = total > 0 && item ? Math.round((item.count / total) * 100) : 0;
                  return `${value.replace(' Leads', '')} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
