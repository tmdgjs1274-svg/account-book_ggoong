'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// 메인 하단/사이드 탭(홈·내역·예산·통계·반복)에 없는 서브 화면(카테고리 관리,
// 구성원 관리, 그룹 관리 등)에서 왔던 곳으로 돌아가기 위한 공통 뒤로가기 버튼.
export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-surface-alt"
      aria-label="뒤로가기"
    >
      <ChevronLeft size={22} />
    </button>
  );
}
