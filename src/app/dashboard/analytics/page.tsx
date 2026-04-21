import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CampaignChart } from '@/components/analytics/campaign-chart';
import { LeadChart } from '@/components/analytics/lead-chart';
import { Mail, Search, Trash2, TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

async function getAnalytics(userId: string) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, 'MMM') };
  });

  const campaignsByMonth = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const [count, agg] = await Promise.all([
        prisma.campaign.count({
          where: {
            execution: { userId },
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.campaign.aggregate({
          where: {
            execution: { userId },
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalLeadsSent: true },
        }),
      ]);
      return { month: label, count, sent: agg._sum.totalLeadsSent ?? 0 };
    })
  );

  const leadsBySheet = await prisma.scraperJob.groupBy({
    by: ['targetSheet'],
    where: { execution: { userId } },
    _sum: { validEmails: true },
  });

  const [totalCampaigns, totalLeads, totalDeleted, successRate] = await Promise.all([
    prisma.campaign.count({ where: { execution: { userId } } }),
    prisma.scraperJob.aggregate({
      where: { execution: { userId } },
      _sum: { validEmails: true },
    }),
    prisma.cleanupLog.aggregate({
      where: { execution: { userId } },
      _sum: { deletedCount: true },
    }),
    Promise.all([
      prisma.workflowExecution.count({ where: { userId, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: { userId } }),
    ]).then(([s, t]) => (t > 0 ? Math.round((s / t) * 100) : 0)),
  ]);

  return {
    totalCampaigns,
    totalLeads: totalLeads._sum.validEmails ?? 0,
    totalDeleted: totalDeleted._sum.deletedCount ?? 0,
    successRate,
    campaignsByMonth,
    leadsBySheet: leadsBySheet.map((r: { targetSheet: string; _sum: { validEmails: number | null } }) => ({
      sheet: r.targetSheet,
      count: r._sum.validEmails ?? 0,
    })),
  };
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const data = await getAnalytics(session.user.id);

  return (
    <div>
      <Header title="Analytics" description="Performance metrics for all workflows" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Total Campaigns"
            value={data.totalCampaigns}
            subtitle="All time"
            icon={Mail}
          />
          <StatsCard
            title="Valid Leads"
            value={data.totalLeads.toLocaleString()}
            subtitle="Scraped & validated"
            icon={Search}
          />
          <StatsCard
            title="Contacts Deleted"
            value={data.totalDeleted.toLocaleString()}
            subtitle="Via cleanup workflows"
            icon={Trash2}
          />
          <StatsCard
            title="Success Rate"
            value={`${data.successRate}%`}
            subtitle="Across all workflows"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CampaignChart data={data.campaignsByMonth} />
          {data.leadsBySheet.length > 0 ? (
            <LeadChart data={data.leadsBySheet} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border bg-white p-12 text-gray-400">
              <p className="text-sm">No lead data yet. Run a scraper to see charts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
