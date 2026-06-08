'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0077b6', '#2e86ab', '#48cae4', '#00b4d8', '#90e0ef', '#0096c7'];

interface LeadChartProps {
  data: { sheet: string; count: number }[];
}

interface ActiveShapeProps {
  cx: number; cy: number;
  innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number;
  fill: string;
}

// Renders the hovered sector slightly larger — NO black rectangle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as ActiveShapeProps;
  return (
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius - 3}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="none"
    />
  );
};

// Normalize old human-readable sheet names → table1-table6
const SHEET_MAP: Record<string, string> = {
  'All Services Leads': 'table1', 'All Services': 'table1', 'all_service_leads': 'table1',
  'Hair Transplant Leads': 'table2', 'Hair Transplant': 'table2', 'hair_transplant_leads': 'table2',
  'Dental Treatment Leads': 'table3', 'Dental Treatment': 'table3', 'dental_treatment_leads': 'table3',
  'Cosmetic Surgery Leads': 'table4', 'Cosmetic Surgery': 'table4', 'cosmic_surgery_leads': 'table4',
  'Eye Treatment Leads': 'table5', 'Eye Treatment': 'table5', 'eye_treatment_leads': 'table5',
  'IVF Fertility Leads': 'table6', 'IVF Fertility': 'table6', 'ivf_fertility_leads': 'table6',
};

function normalizeSheet(name: string): string {
  return SHEET_MAP[name] ?? name;
}

export function LeadChart({ data }: LeadChartProps) {
  // Merge rows with same normalized name (old + new entries for same table)
  const normalized = data.reduce<{ sheet: string; count: number }[]>((acc, d) => {
    const sheet = normalizeSheet(d.sheet);
    const existing = acc.find((x) => x.sheet === sheet);
    if (existing) { existing.count += d.count; } else { acc.push({ sheet, count: d.count }); }
    return acc;
  }, []);

  const total = normalized.reduce((s, d) => s + d.count, 0);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const active = activeIndex !== undefined ? normalized[activeIndex] : null;
  const activePct = active && total > 0 ? Math.round((active.count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads by Table</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart
              style={{ outline: 'none' }}
              onClick={() => {/* prevent focus */ }}
            >
              <Pie
                data={normalized}
                dataKey="count"
                nameKey="sheet"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={35}
                paddingAngle={2}
                isAnimationActive={false}
                stroke="none"
                strokeWidth={0}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                onTouchStart={(_, index) => setActiveIndex(index)}
                onTouchEnd={() => setActiveIndex(undefined)}
              >
                {normalized.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" strokeWidth={0} />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                formatter={(value: string) => {
                  const item = normalized.find((d) => d.sheet === value);
                  const pct = total > 0 && item ? Math.round((item.count / total) * 100) : 0;
                  return `${value} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom tooltip — shows on hover, positioned in center of donut */}
          {active && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
              <div className="rounded-lg bg-white border border-gray-200 shadow-lg px-3 py-2 text-center">
                <p className="text-xs font-semibold text-gray-800">{active.sheet.replace(' Leads', '')}</p>
                <p className="text-sm font-bold text-[#0077b6]">{active.count.toLocaleString()} leads</p>
                <p className="text-xs text-gray-400">{activePct}%</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
