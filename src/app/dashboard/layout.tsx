import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col min-h-0">
        <main className="flex-1 overflow-y-auto bg-gray-50 min-h-full">{children}</main>
      </div>
    </div>
  );
}
