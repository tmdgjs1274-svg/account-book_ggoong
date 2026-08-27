import clsx from 'clsx';

export default function ProgressBar({
  rate,
  color = '#3182F6',
}: {
  rate: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(rate, 100));
  const over = rate > 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
      <div
        className={clsx('h-full rounded-full transition-all', over && 'bg-expense')}
        style={{ width: `${pct}%`, backgroundColor: over ? undefined : color }}
      />
    </div>
  );
}
