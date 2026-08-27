// 현재 선택된 그룹 컨텍스트를 보관하는 아주 단순한 모듈 스토어.
// api.ts가 요청을 보낼 때 이 값을 읽어 X-Group-Id 헤더로 붙여줍니다.
// (React state는 GroupProvider 쪽에서 별도로 관리하고, 이 값과 동기화합니다)

const STORAGE_KEY = 'hh_budget_current_group_id';

let currentGroupId: string | null = null;

export function getCurrentGroupId(): string | null {
  return currentGroupId;
}

export function setCurrentGroupId(id: string | null) {
  currentGroupId = id;
  try {
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage 접근 불가 환경(프라이빗 모드 등) — 무시하고 메모리 값만 사용
  }
}

export function loadStoredGroupId(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}
