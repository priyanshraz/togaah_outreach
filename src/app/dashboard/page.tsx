import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentExecutions, type ExecutionItem } from '@/components/dashboard/recent-executions';
import { Mail, Search, Trash2, TrendingUp } from 'lucide-react';

async function getDashboardStats(userId: string) {
  const [campaigns, scraperJobs, cleanupLogs, recentExecutions] = await Promise.all([
    prisma.campaign.count({ where: { execution: { userId } } }),
    prisma.scraperJob.aggregate({
      where: { execution: { userId } },
      _sum: { totalScraped: true, validEmails: true },
    }),
    prisma.cleanupLog.aggregate({
      where: { execution: { userId } },
      _sum: { deletedCount: true },
      _count: true,
    }),
    // Include campaign relation so we can get campaignId for delete/reuse
    prisma.workflowExecution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        campaign: { select: { id: true } },
      },
    }),
  ]);

  const successCount = await prisma.workflowExecution.count({
    where: { userId, status: 'SUCCESS' },
  });
  const totalCount = await prisma.workflowExecution.count({ where: { userId } });

  return {
    totalCampaigns: campaigns,
    totalLeadsScraped: scraperJobs._sum.totalScraped ?? 0,
    validLeads: scraperJobs._sum.validEmails ?? 0,
    totalCleanups: cleanupLogs._count ?? 0,
    totalDeleted: cleanupLogs._sum.deletedCount ?? 0,
    successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
    recentExecutions,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const stats = await getDashboardStats(session.user.id);

  // Serialize for the client component
  const executions: ExecutionItem[] = stats.recentExecutions.map((exec) => ({
    id: exec.id,
    workflowType: exec.workflowType,
    workflowName: exec.workflowName,
    status: exec.status,
    createdAt: exec.createdAt,
    campaignId: exec.campaign?.id ?? null,
  }));

  return (
    <div>
      <Header title="Dashboard" description="Overview of your automation workflows" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Total Campaigns"
            value={stats.totalCampaigns}
            subtitle="AI-generated email campaigns"
            icon={Mail}
          />
          <StatsCard
            title="Leads Scraped"
            value={stats.totalLeadsScraped.toLocaleString()}
            subtitle={`${stats.validLeads.toLocaleString()} valid emails`}
            icon={Search}
          />
          <StatsCard
            title="Contacts Cleaned"
            value={stats.totalDeleted.toLocaleString()}
            subtitle={`${stats.totalCleanups} cleanup runs`}
            icon={Trash2}
          />
          <StatsCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            subtitle="Across all workflows"
            icon={TrendingUp}
          />
        </div>

        {/* Recent Executions — client component with delete/reuse */}
        <RecentExecutions initialExecutions={executions} />

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              href: '/dashboard/campaigns/new',
              icon: Mail,
              title: 'New Campaign',
              desc: 'AI-generate & send emails',
              color: 'bg-blue-50 border-blue-200',
            },
            {
              href: '/dashboard/scraper',
              icon: Search,
              title: 'Scrape Leads',
              desc: 'Find leads on Google Maps',
              color: 'bg-green-50 border-green-200',
            },
            {
              href: '/dashboard/cleanup',
              icon: Trash2,
              title: 'Run Cleanup',
              desc: 'Remove old Instantly contacts',
              color: 'bg-red-50 border-red-200',
            },
          ].map(({ href, icon: Icon, title, desc, color }) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 transition-all hover:shadow-md ${color}`}
            >
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Icon className="h-6 w-6 text-[#0077b6]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
