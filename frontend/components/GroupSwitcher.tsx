'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, User, Users, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useGroupContext } from '@/lib/group-context';

export default function GroupSwitcher() {
  const { groups, currentGroup, setGroup } = useGroupContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl bg-surface-alt px-3 py-2.5 text-sm font-semibold text-ink-900"
      >
        {currentGroup ? <Users size={16} className="text-primary" /> : <User size={16} className="text-ink-500" />}
        <span className="flex-1 truncate text-left">{currentGroup ? currentGroup.name : '개인'}</span>
        <ChevronDown size={16} className="text-ink-300" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl bg-white p-2 shadow-sheet">
          <button
            onClick={() => {
              setGroup(null);
              setOpen(false);
            }}
            className={clsx(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
              !currentGroup ? 'bg-primary-50 text-primary' : 'text-ink-700 hover:bg-surface-alt'
            )}
          >
            <User size={16} /> 개인
          </button>

          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGroup(g.id);
                setOpen(false);
              }}
              className={clsx(
                'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
                currentGroup?.id === g.id
                  ? 'bg-primary-50 text-primary'
                  : 'text-ink-700 hover:bg-surface-alt'
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Users size={16} /> {g.name}
              </span>
              <span className="text-xs text-ink-300">{g.member_count}명</span>
            </button>
          ))}

          <div className="my-1 h-px bg-surface-border" />

          <Link
            href="/groups"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-surface-alt"
          >
            <Settings size={16} /> 그룹 관리
          </Link>
        </div>
      )}
    </div>
  );
}
