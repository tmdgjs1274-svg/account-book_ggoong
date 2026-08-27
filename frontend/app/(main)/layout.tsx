import AuthGuard from '@/components/AuthGuard';
import Shell from '@/components/Shell';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
