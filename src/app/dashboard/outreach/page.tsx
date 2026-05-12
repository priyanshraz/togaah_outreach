'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Mail, Users, Eye, MessageSquare, XCircle,
  TrendingUp, RefreshCw, AlertCircle, Activity,
} from 'lucide-react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignAnalytics {
  id: string;
  name: string;
  status: number;
  leads_count: number;
  emails_sent_count: number;
  open_count: number;
  reply_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  contacted_count: number;
  total_opportunities: number;
}

interface Totals {
  total_leads: number;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_bounced: number;
  total_unsubscribed: number;
}

interface AnalyticsResponse {
  success: boolean;
  totals: Totals;
  campaigns: CampaignAnalytics[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den) return '0%';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function CampaignStatus({ status }: { status: number }) {
  const map: Record<number, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
    1: { label: 'Active',    variant: 'success' },
    2: { label: 'Paused',    variant: 'warning' },
    3: { label: 'Completed', variant: 'secondary' },
    0: { label: 'Draft',     variant: 'secondary' },
  };
  const cfg = map[status] ?? { label: 'Unknown', variant: 'secondary' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OutreachAnalyticsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<AnalyticsResponse>({
    queryKey: ['instantly-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/instantly/analytics');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      return json;
    },
    refetchInterval: 60000, // refresh every 60s
  });

  const totals = data?.totals;
  const campaigns = data?.campaigns ?? [];

  return (
    <div>
      <Header
        title="Outreach Analytics"
        description="Live campaign performance from Instantly.ai"
      />

      <div className="p-6 space-y-6">

        {/* Refresh button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Failed to load Instantly analytics</p>
                  <p className="text-sm mt-0.5 text-red-600">
                    {error instanceof Error ? error.message : 'Check your INSTANTLY_API_KEY in environment variables.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </>
        )}

        {/* Stats Grid */}
        {totals && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              title="Total Leads"
              value={totals.total_leads}
              sub="Across all campaigns"
              icon={Users}
              color="bg-blue-100 text-[#0077b6]"
            />
            <StatCard
              title="Emails Sent"
              value={totals.total_sent}
              sub={`${pct(totals.total_sent, totals.total_leads)} of leads contacted`}
              icon={Mail}
              color="bg-indigo-100 text-indigo-600"
            />
            <StatCard
              title="Emails Opened"
              value={totals.total_opened}
              sub={`Open rate: ${pct(totals.total_opened, totals.total_sent)}`}
              icon={Eye}
              color="bg-green-100 text-green-600"
            />
            <StatCard
              title="Replies Received"
              value={totals.total_replied}
              sub={`Reply rate: ${pct(totals.total_replied, totals.total_sent)}`}
              icon={MessageSquare}
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              title="Bounced"
              value={totals.total_bounced}
              sub={`Bounce rate: ${pct(totals.total_bounced, totals.total_sent)}`}
              icon={XCircle}
              color="bg-red-100 text-red-500"
            />
            <StatCard
              title="Unsubscribed"
              value={totals.total_unsubscribed}
              sub={`Unsub rate: ${pct(totals.total_unsubscribed, totals.total_sent)}`}
              icon={TrendingUp}
              color="bg-amber-100 text-amber-600"
            />
          </div>
        )}

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#0077b6]" />
                All Campaigns ({campaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> Leads
                        </span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Sent
                        </span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Opened
                        </span>
                      </TableHead>
                      <TableHead>Open Rate</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Replies
                        </span>
                      </TableHead>
                      <TableHead>Reply Rate</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-3 w-3" /> Bounced
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="hover:bg-gray-50">
                        <TableCell>
                          <p className="font-medium text-gray-900 max-w-[200px] truncate" title={campaign.name}>
                            {campaign.name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <CampaignStatus status={campaign.status} />
                        </TableCell>
                        <TableCell className="font-medium">{campaign.leads_count.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{campaign.emails_sent_count.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-medium">{campaign.open_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            parseFloat(pct(campaign.open_count, campaign.emails_sent_count)) > 30
                              ? 'text-green-600'
                              : parseFloat(pct(campaign.open_count, campaign.emails_sent_count)) > 15
                              ? 'text-amber-600'
                              : 'text-gray-500'
                          }`}>
                            {pct(campaign.open_count, campaign.emails_sent_count)}
                          </span>
                        </TableCell>
                        <TableCell className="text-purple-600 font-medium">{campaign.reply_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-purple-600">
                            {pct(campaign.reply_count, campaign.emails_sent_count)}
                          </span>
                        </TableCell>
                        <TableCell className="text-red-500">{campaign.bounced_count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && campaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-gray-400">
            <Mail className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No campaigns found</p>
            <p className="text-sm">Create campaigns in Instantly.ai to see analytics here</p>
          </div>
        )}

      </div>
    </div>
  );
}
