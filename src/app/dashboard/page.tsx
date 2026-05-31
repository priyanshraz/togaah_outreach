import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentExecutions, type ExecutionItem } from '@/components/dashboard/recent-executions';
import { CampaignChart } from '@/components/analytics/campaign-chart';
import { LeadChart } from '@/components/analytics/lead-chart';
import { Mail, Search, TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

async function getDashboardData(userId: string) {
  try {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, 'MMM') };
    });

    const [
      totalCampaigns,
      scraperJobs,
      recentExecutions,
      successCount,
      totalCount,
      leadsBySheet,
      campaignsByMonth,
    ] = await Promise.all([
      prisma.campaign.count({ where: { execution: { userId } } }),
      prisma.scraperJob.aggregate({
        where: { execution: { userId } },
        _sum: { totalScraped: true, validEmails: true },
      }),
      prisma.workflowExecution.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { campaign: { select: { id: true } } },
      }),
      prisma.workflowExecution.count({ where: { userId, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: { userId } }),
      prisma.scraperJob.groupBy({
        by: ['targetSheet'],
        where: { execution: { userId } },
        _sum: { validEmails: true },
      }),
      Promise.all(
        months.map(async ({ start, end, label }) => {
          const [count, agg] = await Promise.all([
            prisma.campaign.count({
              where: { execution: { userId }, createdAt: { gte: start, lte: end } },
            }),
            prisma.campaign.aggregate({
              where: { execution: { userId }, createdAt: { gte: start, lte: end } },
              _sum: { totalLeadsSent: true },
            }),
          ]);
          return { month: label, count, sent: agg._sum.totalLeadsSent ?? 0 };
        })
      ),
    ]);

    return {
      totalCampaigns,
      totalLeadsScraped: scraperJobs._sum.totalScraped ?? 0,
      validLeads: scraperJobs._sum.validEmails ?? 0,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      recentExecutions,
      campaignsByMonth,
      leadsBySheet: leadsBySheet.map((r) => ({
        sheet: r.targetSheet,
        count: r._sum.validEmails ?? 0,
      })),
    };
  } catch (err) {
    console.error('getDashboardData error:', err);
    return {
      totalCampaigns: 0, totalLeadsScraped: 0, validLeads: 0,
      successRate: 0,
      recentExecutions: [], campaignsByMonth: [], leadsBySheet: [],
    };
  }
}

export default async function DashboardPage() {
  const user = await getAuthUser();
  const stats = await getDashboardData(user?.id ?? '');

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

      <div className="p-4 pb-28 space-y-4 lg:p-6 lg:space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          <StatsCard
            title="Total Email Templates Generated"
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
            title="Workflows Success Rate"
            value={`${stats.successRate}%`}
            subtitle="Across all workflows"
            icon={TrendingUp}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <CampaignChart data={stats.campaignsByMonth} />
          {stats.leadsBySheet.length > 0 ? (
            <LeadChart data={stats.leadsBySheet} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border bg-white p-10 text-gray-400">
              <p className="text-sm">No lead data yet — run a scraper to see charts.</p>
            </div>
          )}
        </div>

        {/* Recent Executions */}
        <RecentExecutions initialExecutions={executions} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          {[
            { href: '/dashboard/campaigns/new', icon: Mail,   title: 'New Campaign', desc: 'AI-generate & send emails',  color: 'bg-blue-50 border-blue-200' },
            { href: '/dashboard/scraper',       icon: Search, title: 'Scrape Leads', desc: 'Find leads on Google Maps',  color: 'bg-green-50 border-green-200' },
          ].map(({ href, icon: Icon, title, desc, color }) => (
            <a key={href} href={href} className={`flex items-center gap-4 rounded-xl border-2 p-5 transition-all hover:shadow-md ${color}`}>
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
