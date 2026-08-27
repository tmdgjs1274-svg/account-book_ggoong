import AuthGuard from '@/components/AuthGuard';
import Shell from '@/components/Shell';
import { GroupProvider } from '@/lib/group-context';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <GroupProvider>
        <Shell>{children}</Shell>
      </GroupProvider>
    </AuthGuard>
  );
}
