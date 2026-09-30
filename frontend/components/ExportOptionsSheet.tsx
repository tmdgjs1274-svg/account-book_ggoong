'use client';

import { X, ImageDown, FileSpreadsheet, Share2 } from 'lucide-react';

export type ExportKind = 'image' | 'excel' | 'share';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectExcel: () => void;
  onSelectShare: () => void;
  shareAvailable: boolean;
  exporting: ExportKind | null;
}

// "거래 내역" 화면 우측 상단의 다운로드 아이콘을 누르면 뜨는 팝업이에요.
// 이미지 저장 / 엑셀 저장 / 공유하기 중 고를 수 있어요.
export default function ExportOptionsSheet({
  open,
  onClose,
  onSelectImage,
  onSelectExcel,
  onSelectShare,
  shareAvailable,
  exporting,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">내보내기</h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSelectImage}
            disabled={exporting !== null}
            className="flex items-center gap-3 rounded-2xl border border-surface-border px-4 py-4 text-left transition hover:bg-surface-alt disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
              <ImageDown size={20} />
            </span>
            <span className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {exporting === 'image' ? '이미지 저장 중...' : '이미지로 저장'}
              </p>
              <p className="text-xs text-ink-300">전체 내역을 이미지 1장으로 저장해요</p>
            </span>
          </button>

          <button
            onClick={onSelectExcel}
            disabled={exporting !== null}
            className="flex items-center gap-3 rounded-2xl border border-surface-border px-4 py-4 text-left transition hover:bg-surface-alt disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
              <FileSpreadsheet size={20} />
            </span>
            <span className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {exporting === 'excel' ? '엑셀 저장 중...' : '엑셀로 저장'}
              </p>
              <p className="text-xs text-ink-300">전체 내역을 xlsx 파일로 저장해요</p>
            </span>
          </button>

          <button
            onClick={onSelectShare}
            disabled={exporting !== null || !shareAvailable}
            className="flex items-center gap-3 rounded-2xl border border-surface-border px-4 py-4 text-left transition hover:bg-surface-alt disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
              <Share2 size={20} />
            </span>
            <span className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {exporting === 'share' ? '공유 이미지 준비 중...' : '공유하기'}
              </p>
              <p className="text-xs text-ink-300">
                {shareAvailable
                  ? '10건씩 나눈 이미지를 사진 앱 저장이나 카톡 전송 등으로 한 번에 보내요'
                  : '이 브라우저에서는 지원되지 않아요 (아이폰·안드로이드 브라우저에서 이용해주세요)'}
              </p>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
