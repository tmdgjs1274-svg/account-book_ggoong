'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Pencil, Trash2, Download, List, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import MonthSwitcher from '@/components/MonthSwitcher';
import TransactionFormSheet from '@/components/TransactionFormSheet';
import ExportOptionsSheet from '@/components/ExportOptionsSheet';
import { useTransactions, useLedgerSettings, useUserSettings, isDataKey } from '@/lib/hooks';
import { api } from '@/lib/api';
import { buildExportChunk } from '@/lib/exportImage';
import { formatWon, formatDateLabel, formatMonthLabel, currentMonthStr } from '@/lib/format';
import type { Transaction, CategoryType } from '@/types';

type FilterType = 'all' | CategoryType;
type ViewMode = 'grouped' | 'flat';

const IMAGE_CHUNK_SIZE = 10;

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [filter, setFilter] = useState<FilterType>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [exporting, setExporting] = useState<'image' | 'excel' | 'share' | null>(null);
  const [shareAvailable, setShareAvailable] = useState(false);
  const { transactions, isLoading, mutate } = useTransactions(month);
  const { bothEnabled, settings } = useLedgerSettings();
  const { settings: userSettings, mutate: mutateUserSettings } = useUserSettings();
  const { mutate: globalMutate } = useSWRConfig();

  // 이 브라우저가 '파일 공유'를 지원하는지 마운트 후에 확인해요 (정적 내보내기 빌드라
  // navigator는 서버에는 없어서, 빌드 중이 아니라 브라우저에서만 확인해야 해요).
  useEffect(() => {
    try {
      const testFile = new File([new Blob()], 'test.png', { type: 'image/png' });
      setShareAvailable(
        typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [testFile] })
      );
    } catch {
      setShareAvailable(false);
    }
  }, []);

  // 일별로 구분해서 볼지, 날짜 구분 없이 쭉 나열해서 볼지 — 그룹과 무관하게
  // 로그인 계정 자체에 저장돼서 다른 기기/그룹에서도 항상 같은 값을 봐요.
  const viewMode: ViewMode = userSettings.transactions_view_mode;

  const handleViewModeToggle = async () => {
    const next: ViewMode = viewMode === 'flat' ? 'grouped' : 'flat';
    mutateUserSettings({ transactions_view_mode: next }, false);
    try {
      await api.put('/api/user-settings', { transactions_view_mode: next });
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

  // 전체 내역을 이미지 1장으로 저장해요. 화면 스크롤 위치와 무관하게 항상
  // 전체가 온전히 찍히도록, 화면 밖에 정확한 높이로 별도로 그려서 캡처해요.
  const handleExportImage = async () => {
    if (filtered.length === 0 || exporting) return;
    setExporting('image');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const monthLabel = `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;

      const node = buildExportChunk({
        chunk: filtered,
        chunkIndex: 0,
        totalChunks: 1,
        monthLabel,
        bothEnabled,
        settings,
        totals,
      });
      document.body.appendChild(node);
      // 폰트/레이아웃이 자리잡을 한 프레임을 기다린 뒤 캡처해요.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const canvas = await html2canvas(node, {
        backgroundColor: '#F2F4F6',
        scale: 2,
        useCORS: true,
        // html2canvas 자체 캔버스 텍스트 렌더러는 한글(받침 있는 글자)을 깨뜨리는
        // 버그가 있어요. foreignObjectRendering을 켜면 브라우저의 실제 텍스트
        // 렌더링을 그대로 이미지로 옮기기 때문에 이 문제가 생기지 않아요.
        foreignObjectRendering: true,
      });
      node.remove();

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `뱅크로그_${month}_거래내역.png`;
      a.click();
      setExportSheetOpen(false);
    } catch {
      alert('이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setExporting(null);
    }
  };

  // 10건씩 나눈 이미지 여러 장을 기기의 '공유하기' 시트로 한 번에 넘겨요.
  // (사진 앱에 한꺼번에 저장하거나, 카톡 등으로 바로 전송할 수 있어요)
  const handleShareImages = async () => {
    if (filtered.length === 0 || exporting || !shareAvailable) return;
    setExporting('share');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const chunks: Transaction[][] = [];
      for (let i = 0; i < filtered.length; i += IMAGE_CHUNK_SIZE) {
        chunks.push(filtered.slice(i, i + IMAGE_CHUNK_SIZE));
      }
      const monthLabel = `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;

      const files: File[] = [];
      for (let i = 0; i < chunks.length; i += 1) {
        const node = buildExportChunk({
          chunk: chunks[i],
          chunkIndex: i,
          totalChunks: chunks.length,
          monthLabel,
          bothEnabled,
          settings,
          totals,
          startIndex: i * IMAGE_CHUNK_SIZE,
        });
        document.body.appendChild(node);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const canvas = await html2canvas(node, {
          backgroundColor: '#F2F4F6',
          scale: 2,
          useCORS: true,
          // html2canvas 자체 캔버스 텍스트 렌더러는 한글(받침 있는 글자)을 깨뜨리는
          // 버그가 있어요. foreignObjectRendering을 켜면 브라우저의 실제 텍스트
          // 렌더링을 그대로 이미지로 옮기기 때문에 이 문제가 생기지 않아요.
          foreignObjectRendering: true,
        });
        node.remove();
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          files.push(
            new File([blob], `뱅크로그_${month}_거래내역_${i + 1}of${chunks.length}.png`, {
              type: 'image/png',
            })
          );
        }
      }

      if (files.length === 0) throw new Error('이미지를 만들지 못했어요.');

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: `${monthLabel} 거래 내역` });
        setExportSheetOpen(false);
      } else {
        alert('이 브라우저에서는 공유하기가 지원되지 않아요.');
      }
    } catch (e) {
      // 사용자가 공유 시트에서 직접 취소한 경우는 에러로 안내하지 않아요.
      if (!(e instanceof Error && e.name === 'AbortError')) {
        alert('공유하기에 실패했어요. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setExporting(null);
    }
  };

  // 현재 필터가 적용된 거래 목록을 엑셀(.xlsx) 파일로 내려받아요.
  // 맨 위에 수입/지출/합계 요약을 같이 넣어요.
  const handleExportExcel = async () => {
    if (filtered.length === 0 || exporting) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');

      const summaryRows: (string | number)[][] = bothEnabled
        ? [
            ['수입', totals.income],
            ['지출', totals.expense],
            ['합계', totals.income - totals.expense],
          ]
        : [[settings.expense_enabled ? '지출' : '수입', settings.expense_enabled ? totals.expense : totals.income]];

      const aoa: (string | number)[][] = [
        [`${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월 거래 내역`],
        [],
        ...summaryRows,
        [],
        ['날짜', '구분', '카테고리', '구매자', '메모', '금액'],
        ...filtered.map((t) => [
          t.occurred_on,
          t.type === 'income' ? '수입' : '지출',
          t.category?.name || '미분류',
          t.spender?.name || '',
          t.memo || '',
          Number(t.amount),
        ]),
      ];

      const sheet = XLSX.utils.aoa_to_sheet(aoa);
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
      setExportSheetOpen(false);
    } catch {
      alert('엑셀 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-bold text-ink-900">거래 내역</h1>
          <button
            onClick={handleViewModeToggle}
            aria-label={viewMode === 'flat' ? '전체 나열 중 (탭하면 일별 보기로)' : '일별 보기 중 (탭하면 전체 나열로)'}
            title={viewMode === 'flat' ? '전체 나열' : '일별 보기'}
            className="rounded-full p-2 text-ink-500 hover:bg-surface-alt"
          >
            {viewMode === 'flat' ? <List size={18} /> : <CalendarDays size={18} />}
          </button>
          <button
            onClick={() => setExportSheetOpen(true)}
            aria-label="이미지/엑셀로 내보내기"
            title="내보내기"
            className="rounded-full p-2 text-ink-500 hover:bg-surface-alt"
          >
            <Download size={18} />
          </button>
        </div>
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

      <ExportOptionsSheet
        open={exportSheetOpen}
        onClose={() => (exporting ? null : setExportSheetOpen(false))}
        onSelectImage={handleExportImage}
        onSelectExcel={handleExportExcel}
        onSelectShare={handleShareImages}
        shareAvailable={shareAvailable}
        exporting={exporting}
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
    <div className="flex items-center justify-between gap-3 px-5 py-4">
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
        <div className="flex items-center gap-1">
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
