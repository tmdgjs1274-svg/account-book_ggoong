'use client';

import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

// 눈 아이콘으로 보기/숨기기가 되는 비밀번호 입력칸이에요.
// 기존 <input type="password" .../> 자리에 그대로 대체해서 쓰면 돼요.
export default function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={clsx(className, 'w-full pr-12')}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
