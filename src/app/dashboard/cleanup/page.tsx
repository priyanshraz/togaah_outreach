import { Header } from '@/components/dashboard/header';
import { CleanupStatus } from '@/components/cleanup/cleanup-status';
import { CleanupHistory } from '@/components/cleanup/cleanup-history';

export default function CleanupPage() {
  return (
    <div>
      <Header
        title="Contact Cleanup"
        description="Automatically remove old contacts from Instantly.ai every 10 days"
      />
      <div className="p-4 pb-16 space-y-4 lg:p-6 lg:space-y-6">
        <CleanupStatus />
        <CleanupHistory />
      </div>
    </div>
  );
}
