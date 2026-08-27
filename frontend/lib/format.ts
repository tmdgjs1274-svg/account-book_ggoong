export function formatWon(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(Math.round(amount)).toLocaleString('ko-KR')}원`;
}

export function formatMonthLabel(month: string): string {
  // month: 'YYYY-MM'
  const [, m] = month.split('-');
  return `${Number(m)}월`;
}

export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

export function shiftMonthStr(month: string, delta: number): string {
  let [y, m] = month.split('-').map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
