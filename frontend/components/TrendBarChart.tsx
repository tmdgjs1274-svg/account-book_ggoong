'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { TrendPoint } from '@/types';
import { formatMonthLabel, formatWon } from '@/lib/format';

export default function TrendBarChart({
  data,
  showIncome = true,
  showExpense = true,
}: {
  data: TrendPoint[];
  showIncome?: boolean;
  showExpense?: boolean;
}) {
  const chartData = data.map((d) => ({ ...d, label: formatMonthLabel(d.month) }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={4}>
          <CartesianGrid vertical={false} stroke="#F2F4F6" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#8B95A1' }}
          />
          <YAxis hide />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatWon(value),
              name === 'income' ? '수입' : '지출',
            ]}
            contentStyle={{ borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 13 }}
          />
          {showIncome && <Bar dataKey="income" fill="#00C2A8" radius={[6, 6, 0, 0]} maxBarSize={18} />}
          {showExpense && <Bar dataKey="expense" fill="#FF6B6B" radius={[6, 6, 0, 0]} maxBarSize={18} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
