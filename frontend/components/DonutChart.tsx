'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { BreakdownItem } from '@/types';
import { formatWon } from '@/lib/format';

export default function DonutChart({ data }: { data: BreakdownItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-300">
        아직 기록된 내역이 없어요
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.category_id} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [formatWon(value), name]}
            contentStyle={{ borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
