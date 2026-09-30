import { formatWon, formatDateLabel } from './format';
import type { Transaction, LedgerSettings } from '@/types';

// 이미지로 내보낼 때, 화면(Shell)의 스크롤 영역 안에서 그대로 캡처하면
// 페이지 스크롤 위치에 따라 높이가 잘리는 문제가 있었어요. 그래서 화면 밖(-9999px)에
// 별도의 DOM을 새로 만들어서 캡처하고 바로 지우는 방식으로 바꿨어요.
// 아래 함수들은 실제 화면의 카드/리스트와 똑같은 Tailwind 클래스를 그대로 사용해요.

// html2canvas는 자체적으로 CSS의 text-overflow: ellipsis(=Tailwind의 truncate)를
// 다시 구현해서 그리는데, 한글·숫자·기호가 섞인 긴 한 줄(날짜 · 메모)에서
// 그 계산이 어긋나 글자가 겹쳐 보이는(깨진 것처럼 보이는) 문제가 있었어요.
// 그래서 내보내기 전용 DOM에서는 CSS truncate 대신 문자열을 미리 잘라서 넣어요.
function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

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
    el(
      'p',
      'overflow-hidden whitespace-nowrap text-sm font-medium text-ink-900',
      truncateText(t.category?.name || '미분류', 14)
    )
  );
  if (t.spender) {
    const badge = el(
      'span',
      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white',
      truncateText(t.spender.name, 8)
    );
    badge.style.backgroundColor = t.spender.color;
    titleRow.appendChild(badge);
  }
  textWrap.appendChild(titleRow);
  const dateLine = formatDateLabel(t.occurred_on) + (t.memo ? ` · ${t.memo}` : '');
  textWrap.appendChild(
    el('p', 'overflow-hidden whitespace-nowrap text-xs text-ink-300', truncateText(dateLine, 22))
  );
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
  // 화면 밖 음수 좌표(예: left: -9999px)에 두면 html2canvas의
  // foreignObjectRendering(아래 html2canvas 호출부 참고)이 빈 이미지를
  // 만들어내는 문제가 있어요. 그래서 좌표는 (0,0)에 그대로 두고, z-index를
  // 맨 뒤로 보내서 실제 화면 내용 뒤에 가려지게 하는 방식으로 안 보이게 해요.
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  container.style.width = '420px';

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
