'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search, Loader2, CheckCircle, History,
  Users, Clock, XCircle,
} from 'lucide-react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { LocationAutocomplete } from '@/components/scraper/location-autocomplete';

interface ScraperResult {
  total_scraped: number;
  total_saved: number;
  table_name: string;
  execution_time: number;
  save_status: string;
}

interface ApiResult {
  result: ScraperResult;
  executionId?: string;
}

type PageState = 'form' | 'loading' | 'success' | 'error';

const LOADING_STEPS = [
  { at: 0,   text: 'Sending request to workflow...' },
  { at: 8,   text: 'Starting lead search...' },
  { at: 20,  text: 'Searching for businesses...' },
  { at: 60,  text: 'Extracting contact details...' },
  { at: 120, text: 'Validating email addresses...' },
  { at: 240, text: 'Saving verified leads to table...' },
  { at: 360, text: 'Finalising records...' },
  { at: 500, text: 'Almost done — wrapping up...' },
];

const TABLE_KEYS = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

export default function ScraperPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pageState, setPageState] = useState<PageState>('form');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [niches, setNiches] = useState('');
  const [fullLocation, setFullLocation] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [targetSheet, setTargetSheet] = useState('');

  // Lead counts per table
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch('/api/leads/counts')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pageState !== 'loading') { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [pageState]);

  const currentStep = [...LOADING_STEPS].reverse().find((s) => elapsed >= s.at) ?? LOADING_STEPS[0];
  const progressPct = Math.min((elapsed / 600) * 100, 95);

  function formatTime(s: number) {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niches.trim() || !fullLocation.trim() || !targetSheet) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setPageState('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niches: niches.trim(), location: fullLocation.trim(), max_results: Math.min(500, Math.max(50, Number(maxResults) || 50)), target_sheet: targetSheet }),
        signal: AbortSignal.timeout(620000),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scraper failed');

      setResult(data);
      setPageState('success');
      queryClient.invalidateQueries({ queryKey: ['scraper-jobs'] });
      toast({ title: '✅ Scraping complete!', description: `${data.result?.total_saved ?? 0} leads saved.` });

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setPageState('error');
      toast({ title: 'Scraper failed', description: err instanceof Error ? err.message : 'Try again.', variant: 'destructive' });
    }
  }

  // ── FORM + LOADING ────────────────────────────────────────────────────────

  if (pageState === 'form' || pageState === 'loading') {
    return (
      <div>
        <Header
          title="Lead Scraper"
          description="Find business leads and save verified contacts to your lead tables"
        />

        {/* Full-screen loading overlay */}
        {pageState === 'loading' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center space-y-6">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#0077b6]/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#0077b6] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="h-8 w-8 text-[#0077b6]" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">Scraping Leads...</h3>
                <p className="text-sm text-[#0077b6] mt-1 min-h-[20px] font-medium">{currentStep.text}</p>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-[#0077b6] h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{formatTime(elapsed)} elapsed · typically 2–8 minutes</span>
              </div>

              <p className="text-xs text-gray-300">Please keep this tab open</p>
            </div>
          </div>
        )}

        <div className="p-6 pb-16 max-w-2xl mx-auto">
          <div className="flex justify-end mb-4">
            <Button variant="outline" asChild className="gap-2 text-sm">
              <Link href="/dashboard/scraper/history">
                <History className="h-4 w-4" /> View History
              </Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search Configuration</CardTitle>
                <CardDescription>Configure your lead search parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Niches <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={niches}
                    onChange={(e) => setNiches(e.target.value)}
                    placeholder="e.g. hair clinic, dental clinic, cosmetic surgery"
                    disabled={pageState === 'loading'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated list of business types</p>
                </div>

                {/* Location autocomplete */}
                <div>
                  <LocationAutocomplete
                    label="Location (City, Country)"
                    value={fullLocation}
                    onChange={setFullLocation}
                    placeholder="e.g. London, United Kingdom"
                    disabled={pageState === 'loading'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Type 2+ characters to search and select a location</p>
                </div>

                {/* Max Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Results <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={50}
                    max={500}
                    value={maxResults}
                    onChange={(e) => setMaxResults(e.target.value)}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!val || val < 50) setMaxResults('50');
                      else if (val > 500) setMaxResults('500');
                    }}
                    disabled={pageState === 'loading'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Min 50 · Max 500 per run</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Save Verified Leads To <span className="text-red-500">*</span>
                  </label>
                  <Select onValueChange={setTargetSheet} disabled={pageState === 'loading'}>
                    <SelectTrigger><SelectValue placeholder="Select a lead table" /></SelectTrigger>
                    <SelectContent>
                      {TABLE_KEYS.map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="font-medium">{t}</span>
                          {counts[t] !== undefined && (
                            <span className="ml-2 text-gray-400 text-xs">— {counts[t].toLocaleString()} leads</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Note:</strong> This process takes 2–8 minutes depending on the number of results. Please keep this tab open.
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0077b6] hover:bg-[#005f8f] text-white"
              size="lg"
              disabled={pageState === 'loading'}
            >
              {pageState === 'loading' ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scraping in progress...</>
              ) : (
                <><Search className="mr-2 h-5 w-5" /> Start Lead Scraper</>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────

  if (pageState === 'success' && result?.result) {
    const r = result.result;

    return (
      <div>
        <Header title="Lead Scraper" description="Scraping completed successfully" />
        <div className="p-6 pb-16 max-w-2xl mx-auto space-y-6">

          <div className="flex flex-col items-center text-center py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-3">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Scraping Complete!</h2>
            <p className="text-sm text-gray-500 mt-1">
              {r.execution_time ? `Completed in ${formatTime(r.execution_time)}` : ''}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center border-blue-200 bg-blue-50">
              <CardContent className="pt-5 pb-4">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-3xl font-bold text-blue-700">{r.total_scraped.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">Total Leads Found</p>
              </CardContent>
            </Card>
            <Card className="text-center border-green-200 bg-green-50">
              <CardContent className="pt-5 pb-4">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-3xl font-bold text-green-700">{r.total_saved.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">Leads Saved to Table</p>
              </CardContent>
            </Card>
          </div>

          {/* Table info */}
          <Card className="border-green-200">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Saved to Table</span>
                <span className="font-semibold text-gray-800">{r.table_name.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Save Status</span>
                <span className={`font-semibold ${r.save_status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {r.save_status === 'success' ? '✅ Saved successfully' : r.save_status}
                </span>
              </div>
              {r.total_scraped > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Save Rate</span>
                  <span className="font-semibold text-[#0077b6]">
                    {Math.round((r.total_saved / r.total_scraped) * 100)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => { setPageState('form'); setNiches(''); setFullLocation(''); setMaxResults('100'); setTargetSheet(''); }}>
              <Search className="mr-2 h-4 w-4" /> Scrape Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/scraper/history">
                <History className="mr-2 h-4 w-4" /> View History
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Lead Scraper" description="Something went wrong" />
      <div className="p-6 max-w-md mx-auto mt-8">
        <Card className="border-red-200">
          <CardContent className="pt-8 pb-6 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-9 w-9 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Scraper Failed</h3>
              <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setPageState('form')}>Try Again</Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/scraper/history">View History</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
