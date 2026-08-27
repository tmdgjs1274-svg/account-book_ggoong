import clsx from 'clsx';

export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-2xl bg-white p-5 shadow-card', className)}>{children}</div>
  );
}
