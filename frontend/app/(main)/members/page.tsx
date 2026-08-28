'use client';

import BackButton from '@/components/BackButton';
import SpenderManager from '@/components/managers/SpenderManager';

// 이 페이지는 "설정" 안의 구성원 관리 탭과 동일한 내용을 보여주는
// 직접 링크용 화면이에요 (예: 즐겨찾기, 뒤로가기로 온 경우 등).
export default function MembersPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-bold text-ink-900">구성원 관리</h1>
      </div>
      <SpenderManager />
    </div>
  );
}
