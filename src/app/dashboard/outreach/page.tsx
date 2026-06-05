'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Mail, Users, Eye, MessageSquare, XCircle,
  CheckCircle, RefreshCw, AlertCircle, Activity,
  TrendingUp, MousePointer,
} from 'lucide-react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  leads_count: number;
  contacted_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  open_count: number;
  open_count_unique: number;
  reply_count: number;
  reply_count_unique: number;
  link_click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
}

interface Totals {
  total_leads: number;
  total_contacted: number;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_completed: number;
  total_opportunities: number;
}

interface AnalyticsResponse {
  success: boolean;
  totals: Totals;
  campaigns: Campaign[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den || !num) return '0%';
  return `${((num / den) * 100).toFixed(1)}%`;
}


function StatCard({
  title, value, sub, icon: Icon, colorClass,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
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
    refetchInterval: 60000,
  });

  const totals    = data?.totals;
  const campaigns = data?.campaigns ?? [];

  return (
    <div>
      <Header
        title="Outreach Analytics"
        description="Live campaign performance powered by Instantly.ai"
      />

      <div className="p-4 pb-28 space-y-4 lg:p-6 lg:space-y-6">

        {/* Refresh */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-5 pb-4 flex items-start gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Failed to load analytics</p>
                <p className="text-sm mt-0.5 text-red-600">
                  {error instanceof Error ? error.message : 'Check INSTANTLY_API_KEY in Vercel environment variables.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1,2,3,4,5,6,7,8].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        )}

        {/* ── Totals Grid ── */}
        {totals && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Total Leads"      value={totals.total_leads}
              sub="In all campaigns"
              icon={Users} colorClass="bg-blue-100 text-blue-600" />
            <StatCard title="Contacted"         value={totals.total_contacted}
              sub={`${pct(totals.total_contacted, totals.total_leads)} of leads`}
              icon={Mail} colorClass="bg-indigo-100 text-indigo-600" />
            <StatCard title="Emails Sent"       value={totals.total_sent}
              sub="Total outgoing emails"
              icon={Mail} colorClass="bg-[#0077b6]/10 text-[#0077b6]" />
            <StatCard title="Opened"            value={totals.total_opened}
              sub={`Open rate: ${pct(totals.total_opened, totals.total_sent)}`}
              icon={Eye} colorClass="bg-green-100 text-green-600" />
            <StatCard title="Replies"           value={totals.total_replied}
              sub={`Reply rate: ${pct(totals.total_replied, totals.total_sent)}`}
              icon={MessageSquare} colorClass="bg-purple-100 text-purple-600" />
            <StatCard title="Completed"         value={totals.total_completed}
              sub="Finished sequences"
              icon={CheckCircle} colorClass="bg-teal-100 text-teal-600" />
            <StatCard title="Bounced"           value={totals.total_bounced}
              sub={`Bounce rate: ${pct(totals.total_bounced, totals.total_sent)}`}
              icon={XCircle} colorClass="bg-red-100 text-red-500" />
            <StatCard title="Unsubscribed"      value={totals.total_unsubscribed}
              sub={`Unsub rate: ${pct(totals.total_unsubscribed, totals.total_sent)}`}
              icon={TrendingUp} colorClass="bg-amber-100 text-amber-600" />
          </div>
        )}

        {/* ── Campaigns Table ── */}
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
                      <TableHead>Campaign</TableHead>
                      <TableHead><span className="flex items-center gap-1"><Users className="h-3 w-3"/>Leads</span></TableHead>
                      <TableHead><span className="flex items-center gap-1"><Mail className="h-3 w-3"/>Contacted</span></TableHead>
                      <TableHead><span className="flex items-center gap-1"><Mail className="h-3 w-3"/>Sent</span></TableHead>
                      <TableHead><span className="flex items-center gap-1 text-green-600"><Eye className="h-3 w-3"/>Opened</span></TableHead>
                      <TableHead>Open %</TableHead>
                      <TableHead><span className="flex items-center gap-1 text-purple-600"><MessageSquare className="h-3 w-3"/>Replies</span></TableHead>
                      <TableHead>Reply %</TableHead>
                      <TableHead><span className="flex items-center gap-1 text-blue-500"><MousePointer className="h-3 w-3"/>Clicks</span></TableHead>
                      <TableHead><span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3"/>Bounced</span></TableHead>
                      <TableHead><span className="flex items-center gap-1 text-teal-600"><CheckCircle className="h-3 w-3"/>Done</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.campaign_id} className="hover:bg-gray-50">
                        <TableCell>
                          <p className="font-medium text-gray-900 whitespace-normal break-words">
                            {c.campaign_name}
                          </p>
                        </TableCell>
                        <TableCell className="font-medium">{c.leads_count.toLocaleString()}</TableCell>
                        <TableCell>{c.contacted_count.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{c.emails_sent_count.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-medium">{c.open_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.open_count / (c.emails_sent_count || 1) > 0.3 ? 'bg-green-100 text-green-700'
                            : c.open_count / (c.emails_sent_count || 1) > 0.1 ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {pct(c.open_count, c.emails_sent_count)}
                          </span>
                        </TableCell>
                        <TableCell className="text-purple-600 font-medium">{c.reply_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.reply_count / (c.emails_sent_count || 1) > 0.05 ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {pct(c.reply_count, c.emails_sent_count)}
                          </span>
                        </TableCell>
                        <TableCell className="text-blue-500">{c.link_click_count.toLocaleString()}</TableCell>
                        <TableCell className="text-red-500 font-medium">{c.bounced_count.toLocaleString()}</TableCell>
                        <TableCell className="text-teal-600">{c.completed_count.toLocaleString()}</TableCell>
                        <TableCell>
                          {c.bounced_count > 0 ? (
                            confirmId === c.campaign_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-600 font-medium">Delete {c.bounced_count}?</span>
                                <button
                                  onClick={() => handleDeleteBounced(c.campaign_id)}
                                  disabled={deletingId === c.campaign_id}
                                  className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-50"
                                >
                                  {deletingId === c.campaign_id ? '...' : 'Yes'}
                                </button>
                                <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteBounced(c.campaign_id)}
                                disabled={deletingId === c.campaign_id}
                                className="flex items-center gap-1 text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-40 whitespace-nowrap"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete Bounced
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty */}
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
