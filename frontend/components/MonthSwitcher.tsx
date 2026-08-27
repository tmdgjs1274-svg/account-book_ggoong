import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, shiftMonthStr, currentMonthStr } from '@/lib/format';

export default function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const isCurrent = month === currentMonthStr();
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(shiftMonthStr(month, -1))}
        className="rounded-full p-1.5 text-ink-500 hover:bg-surface-alt"
        aria-label="이전 달"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="min-w-[3.5rem] text-center text-lg font-bold text-ink-900">
        {formatMonthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonthStr(month, 1))}
        disabled={isCurrent}
        className="rounded-full p-1.5 text-ink-500 hover:bg-surface-alt disabled:opacity-30"
        aria-label="다음 달"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
