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
      <div className="p-6 space-y-6">
        <CleanupStatus />
        <CleanupHistory />
      </div>
    </div>
  );
}
