'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import useSWR from 'swr';
import { api } from './api';
import { getCurrentGroupId, setCurrentGroupId, loadStoredGroupId } from './group-store';
import { useAuth } from './auth-context';
import type { Group } from '@/types';

interface GroupContextValue {
  groups: Group[];
  currentGroupId: string | null;
  currentGroup: Group | null;
  setGroup: (id: string | null) => void;
  refreshGroups: () => void;
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue>({
  groups: [],
  currentGroupId: null,
  currentGroup: null,
  setGroup: () => {},
  refreshGroups: () => {},
  isLoading: true,
});

export function GroupProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [currentGroupId, setCurrentGroupIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const {
    data: groups,
    isLoading,
    mutate,
  } = useSWR<Group[]>(session ? '/api/groups' : null, api.get);

  // 최초 마운트 시 로컬에 저장해둔 마지막 선택 컨텍스트 복원
  useEffect(() => {
    const stored = loadStoredGroupId();
    setCurrentGroupIdState(stored);
    setCurrentGroupId(stored);
    setHydrated(true);
  }, []);

  const setGroup = useCallback((id: string | null) => {
    setCurrentGroupIdState(id);
    setCurrentGroupId(id);
  }, []);

  // 저장돼 있던 그룹이 더 이상 내가 속한 그룹이 아니면(탈퇴 등) 개인으로 복귀
  useEffect(() => {
    if (!hydrated || !groups) return;
    if (currentGroupId && !groups.some((g) => g.id === currentGroupId)) {
      setGroup(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, hydrated]);

  const currentGroup = groups?.find((g) => g.id === currentGroupId) || null;

  return (
    <GroupContext.Provider
      value={{
        groups: groups || [],
        currentGroupId: hydrated ? currentGroupId : getCurrentGroupId(),
        currentGroup,
        setGroup,
        refreshGroups: () => mutate(),
        isLoading: !!session && isLoading,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  return useContext(GroupContext);
}
