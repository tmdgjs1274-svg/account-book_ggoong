'use client';

import { useMemo, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Pencil, Trash2, ImageDown, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import MonthSwitcher from '@/components/MonthSwitcher';
import TransactionFormSheet from '@/components/TransactionFormSheet';
import { useTransactions, useLedgerSettings, useUserSettings, isDataKey } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatWon, formatDateLabel, formatMonthLabel, currentMonthStr } from '@/lib/format';
import type { Transaction, CategoryType } from '@/types';

type FilterType = 'all' | CategoryType;
type ViewMode = 'grouped' | 'flat';

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [filter, setFilter] = useState<FilterType>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState<'image' | 'excel' | null>(null);
  const { transactions, isLoading, mutate } = useTransactions(month);
  const { bothEnabled, settings } = useLedgerSettings();
  const { settings: userSettings, mutate: mutateUserSettings } = useUserSettings();
  const { mutate: globalMutate } = useSWRConfig();
  const exportRef = useRef<HTMLDivElement>(null);

  // 일별로 구분해서 볼지, 날짜 구분 없이 쭉 나열해서 볼지 — 그룹과 무관하게
  // 로그인 계정 자체에 저장돼서 다른 기기/그룹에서도 항상 같은 값을 봐요.
  const viewMode: ViewMode = userSettings.transactions_view_mode;

  const handleViewModeChange = async (mode: ViewMode) => {
    if (mode === viewMode) return;
    mutateUserSettings({ transactions_view_mode: mode }, false);
    try {
      await api.put('/api/user-settings', { transactions_view_mode: mode });
    } catch {
      mutateUserSettings();
    }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!map.has(t.occurred_on)) map.set(t.occurred_on, []);
      map.get(t.occurred_on)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 거래를 삭제할까요?')) return;
    await api.del(`/api/transactions/${id}`);
    mutate();
    globalMutate((key) => isDataKey(key, '/api/stats'));
    globalMutate((key) => isDataKey(key, '/api/budgets'));
  };

  // 지금 화면(요약 + 목록)을 그대로 PNG 이미지로 저장해요.
  const handleExportImage = async () => {
    if (!exportRef.current || exporting) return;
    setExporting('image');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#F2F4F6',
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `뱅크로그_${month}_거래내역.png`;
      a.click();
    } catch {
      alert('이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setExporting(null);
    }
  };

  // 현재 필터가 적용된 거래 목록을 엑셀(.xlsx) 파일로 내려받아요.
  const handleExportExcel = async () => {
    if (filtered.length === 0 || exporting) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((t) => ({
        날짜: t.occurred_on,
        구분: t.type === 'income' ? '수입' : '지출',
        카테고리: t.category?.name || '미분류',
        구매자: t.spender?.name || '',
        메모: t.memo || '',
        금액: Number(t.amount),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 14 },
        { wch: 10 },
        { wch: 26 },
        { wch: 12 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, formatMonthLabel(month));
      XLSX.writeFile(workbook, `뱅크로그_${month}_거래내역.xlsx`);
    } catch {
      alert('엑셀 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">거래 내역</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {bothEnabled && (
        <div className="flex gap-2">
          {(
            [
              ['all', '전체'],
              ['expense', '지출'],
              ['income', '수입'],
            ] as [FilterType, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                filter === value ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 보기 방식 토글 + 내보내기 버튼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
          {(
            [
              ['flat', '전체 나열'],
              ['grouped', '일별 보기'],
            ] as [ViewMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => handleViewModeChange(value)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                viewMode === value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={handleExportImage}
            disabled={exporting !== null}
            className="flex items-center gap-1 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-surface-alt disabled:opacity-50"
          >
            <ImageDown size={14} />
            이미지
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="flex items-center gap-1 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-surface-alt disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            엑셀
          </button>
        </div>
      </div>

      {/* 이미지로 저장할 때 이 영역만 캡처해요 (위 토글/버튼은 제외) */}
      <div ref={exportRef} className="flex flex-col gap-5">
        <p className="px-1 text-xs font-semibold text-ink-300">
          {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월 거래 내역
        </p>

        {bothEnabled ? (
          <Card className="flex justify-around text-center">
            <div>
              <p className="text-xs text-ink-300">수입</p>
              <p className="text-base font-bold text-income">{formatWon(totals.income)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-300">지출</p>
              <p className="text-base font-bold text-expense">{formatWon(totals.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-300">합계</p>
              <p className="text-base font-bold text-ink-900">
                {formatWon(totals.income - totals.expense)}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center text-center">
            <p className="text-xs text-ink-300">{settings.expense_enabled ? '지출' : '수입'}</p>
            <p
              className={clsx(
                'text-base font-bold',
                settings.expense_enabled ? 'text-expense' : 'text-income'
              )}
            >
              {formatWon(settings.expense_enabled ? totals.expense : totals.income)}
            </p>
          </Card>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-ink-300">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-300">기록된 거래가 없어요</p>
        ) : viewMode === 'grouped' ? (
          grouped.map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 px-1 text-xs font-semibold text-ink-300">
                {formatDateLabel(date)}
              </p>
              <Card className="divide-y divide-surface-border !p-0">
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    t={t}
                    showDate={false}
                    onEdit={() => {
                      setEditing(t);
                      setSheetOpen(true);
                    }}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </Card>
            </div>
          ))
        ) : (
          <Card className="divide-y divide-surface-border !p-0">
            {filtered.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                showDate
                onEdit={() => {
                  setEditing(t);
                  setSheetOpen(true);
                }}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </Card>
        )}
      </div>

      <TransactionFormSheet
        open={sheetOpen}
        initial={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setSheetOpen(false);
          setEditing(null);
          mutate();
        }}
      />
    </div>
  );
}

function TransactionRow({
  t,
  showDate,
  onEdit,
  onDelete,
}: {
  t: Transaction;
  showDate: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: t.category?.color || '#B0B8C1' }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-ink-900">
              {t.category?.name || '미분류'}
            </p>
            {t.spender && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: t.spender.color }}
              >
                {t.spender.name}
              </span>
            )}
          </div>
          {showDate ? (
            <p className="truncate text-xs text-ink-300">
              {formatDateLabel(t.occurred_on)}
              {t.memo && <span> · {t.memo}</span>}
            </p>
          ) : (
            t.memo && <p className="truncate text-xs text-ink-300">{t.memo}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={clsx(
              'whitespace-nowrap text-[10px] font-semibold',
              t.type === 'income' ? 'text-income' : 'text-expense'
            )}
          >
            {t.type === 'income' ? '수입' : '지출'}
          </span>
          <span className="whitespace-nowrap text-sm font-semibold text-ink-900">
            {formatWon(t.amount)}
          </span>
        </div>
        {/* 이미지로 내보낼 때는 수정/삭제 버튼이 필요 없으니 캡처에서 제외해요 */}
        <div className="flex items-center gap-1" data-html2canvas-ignore="true">
          <button onClick={onEdit} className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt">
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
