import { formatWon, formatDateLabel } from './format';
import type { Transaction, LedgerSettings } from '@/types';

// 이미지로 내보낼 때, 화면(Shell)의 스크롤 영역 안에서 그대로 캡처하면
// 페이지 스크롤 위치에 따라 높이가 잘리는 문제가 있었어요. 그래서 화면 밖(-9999px)에
// 별도의 DOM을 새로 만들어서 캡처하고 바로 지우는 방식으로 바꿨어요.
// 아래 함수들은 실제 화면의 카드/리스트와 똑같은 Tailwind 클래스를 그대로 사용해요.

// html2canvas는 사이트에서 쓰는 가변 폰트(Pretendard Variable)를 캡처할 때
// 글자가 다른 글자로 깨져 보이는 알려진 문제가 있어요. 내보내는 이미지에서만
// 기기에 이미 설치된 일반(가변 아님) 한글 폰트를 쓰도록 강제해서 이 문제를 피해요.
const EXPORT_FONT_STACK =
  "'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildStat(label: string, value: string, colorClass: string): HTMLDivElement {
  const wrap = el('div');
  wrap.appendChild(el('p', 'text-xs text-ink-300', label));
  wrap.appendChild(el('p', `text-base font-bold ${colorClass}`, value));
  return wrap;
}

function buildTotalsCard(
  bothEnabled: boolean,
  settings: LedgerSettings,
  totals: { income: number; expense: number }
): HTMLDivElement {
  if (bothEnabled) {
    const card = el('div', 'flex justify-around rounded-2xl bg-white p-5 text-center shadow-card');
    card.appendChild(buildStat('수입', formatWon(totals.income), 'text-income'));
    card.appendChild(buildStat('지출', formatWon(totals.expense), 'text-expense'));
    card.appendChild(buildStat('합계', formatWon(totals.income - totals.expense), 'text-ink-900'));
    return card;
  }
  const card = el(
    'div',
    'flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-card'
  );
  const label = settings.expense_enabled ? '지출' : '수입';
  const value = settings.expense_enabled ? totals.expense : totals.income;
  const colorClass = settings.expense_enabled ? 'text-expense' : 'text-income';
  card.appendChild(el('p', 'text-xs text-ink-300', label));
  card.appendChild(el('p', `text-base font-bold ${colorClass}`, formatWon(value)));
  return card;
}

/** index는 1부터 시작하는 전체 목록 기준 순번이에요 (각 내역 앞에 숫자로 표시). */
function buildRow(t: Transaction, index: number): HTMLDivElement {
  const row = el('div', 'flex items-center justify-between gap-3 px-5 py-4');

  const left = el('div', 'flex min-w-0 items-center gap-3');
  left.appendChild(el('span', 'w-5 shrink-0 text-right text-[11px] font-semibold text-ink-300', String(index)));
  const dot = el('span', 'h-2.5 w-2.5 shrink-0 rounded-full');
  dot.style.backgroundColor = t.category?.color || '#B0B8C1';
  left.appendChild(dot);

  const textWrap = el('div', 'min-w-0');
  const titleRow = el('div', 'flex items-center gap-1.5');
  titleRow.appendChild(
    el('p', 'truncate text-sm font-medium text-ink-900', t.category?.name || '미분류')
  );
  if (t.spender) {
    const badge = el(
      'span',
      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white',
      t.spender.name
    );
    badge.style.backgroundColor = t.spender.color;
    titleRow.appendChild(badge);
  }
  textWrap.appendChild(titleRow);
  const dateLine = formatDateLabel(t.occurred_on) + (t.memo ? ` · ${t.memo}` : '');
  textWrap.appendChild(el('p', 'truncate text-xs text-ink-300', dateLine));
  left.appendChild(textWrap);
  row.appendChild(left);

  const right = el('div', 'flex shrink-0 flex-col items-end gap-0.5');
  right.appendChild(
    el(
      'span',
      `whitespace-nowrap text-[10px] font-semibold ${
        t.type === 'income' ? 'text-income' : 'text-expense'
      }`,
      t.type === 'income' ? '수입' : '지출'
    )
  );
  right.appendChild(
    el('span', 'whitespace-nowrap text-sm font-semibold text-ink-900', formatWon(t.amount))
  );
  row.appendChild(right);

  return row;
}

/**
 * 거래 내역 한 묶음을 화면 밖에 렌더링해서 캡처 가능한 DOM으로 만들어요.
 * startIndex를 넘기면, 여러 장으로 나뉘어도(공유하기) 번호가 전체 목록 기준으로
 * 이어져요 (예: 2번째 장은 11번부터 시작).
 */
export function buildExportChunk({
  chunk,
  chunkIndex,
  totalChunks,
  monthLabel,
  bothEnabled,
  settings,
  totals,
  startIndex = 0,
}: {
  chunk: Transaction[];
  chunkIndex: number;
  totalChunks: number;
  monthLabel: string;
  bothEnabled: boolean;
  settings: LedgerSettings;
  totals: { income: number; expense: number };
  startIndex?: number;
}): HTMLDivElement {
  const container = el('div', 'flex flex-col gap-4 bg-surface-alt p-4');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '420px';
  container.style.fontFamily = EXPORT_FONT_STACK;

  const title =
    totalChunks > 1
      ? `${monthLabel} 거래 내역 (${chunkIndex + 1}/${totalChunks})`
      : `${monthLabel} 거래 내역`;
  container.appendChild(el('p', 'px-1 text-xs font-semibold text-ink-300', title));
  container.appendChild(buildTotalsCard(bothEnabled, settings, totals));

  const listCard = el('div', 'divide-y divide-surface-border rounded-2xl bg-white shadow-card');
  chunk.forEach((t, i) => listCard.appendChild(buildRow(t, startIndex + i + 1)));
  container.appendChild(listCard);

  return container;
}
