import { MobileLayout } from '@/components/dashboard/mobile-layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MobileLayout>{children}</MobileLayout>;
}
