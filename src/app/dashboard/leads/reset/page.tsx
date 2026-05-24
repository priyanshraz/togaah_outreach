'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Loader2, Clock, RotateCcw,
} from 'lucide-react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface ResetResult {
  display_name: string;
  rows_reset: number;
  timestamp: string;
  table_name: string;
}

type PageState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

const TABLES = [
  { value: 'table1', label: 'All Services Leads' },
  { value: 'table2', label: 'Hair Transplant Leads' },
  { value: 'table3', label: 'Dental Treatment Leads' },
  { value: 'table4', label: 'Cosmetic Surgery Leads' },
  { value: 'table5', label: 'Eye Treatment Leads' },
  { value: 'table6', label: 'IVF Fertility Leads' },
];

interface HistoryItem {
  display_name: string;
  rows_reset: number;
  timestamp: string;
}

export default function ResetLeadStatusPage() {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [result, setResult] = useState<ResetResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const selectedLabel = TABLES.find((t) => t.value === selectedTable)?.label ?? '';

  function handleResetClick() {
    if (!selectedTable) return;
    setPageState('confirming');
  }

  async function handleConfirm() {
    setPageState('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads/reset-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: selectedTable }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      setResult(data);
      setPageState('success');
      setHistory((prev) => [
        { display_name: data.display_name, rows_reset: data.rows_reset, timestamp: data.timestamp },
        ...prev.slice(0, 9),
      ]);
      setSelectedTable('');
      toast({ title: '✅ Reset successful!', description: `${data.rows_reset} leads are now available again` });

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setPageState('error');
      toast({ title: 'Reset failed', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' });
    }
  }

  function handleCancel() { setPageState('idle'); }
  function handleReset() { setPageState('idle'); setResult(null); setErrorMsg(''); }

  return (
    <div>
      <Header
        title="Reset Lead Status"
        description="Clear the sent status of leads in any table so they become available for new campaigns"
      />

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-[#0077b6]" />
              Lead Status Reset
            </CardTitle>
            <CardDescription>
              Select a table and confirm — all sent leads in that table will be available for campaigns again
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Table Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Lead Table
              </label>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={pageState === 'loading'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a table to reset..." />
                </SelectTrigger>
                <SelectContent>
                  {TABLES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning box */}
            {selectedTable && pageState === 'idle' && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This action will clear the sent status of all leads in <strong>{selectedLabel}</strong>.
                  These leads will become available for new campaigns again.
                </p>
              </div>
            )}

            {/* Confirm dialog */}
            {pageState === 'confirming' && (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Are you sure?</p>
                    <p className="text-sm text-red-700 mt-0.5">
                      The sent status of all leads in <strong>{selectedLabel}</strong> will be reset.
                      This action <strong>cannot be undone.</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleConfirm}
                  >
                    Yes, Reset Now
                  </Button>
                </div>
              </div>
            )}

            {/* Loading */}
            {pageState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#0077b6]" />
                <p className="font-medium text-gray-700">Resetting... Please wait</p>
                <p className="text-sm text-gray-400">Clearing sent status for {selectedLabel}</p>
              </div>
            )}

            {/* Success */}
            {pageState === 'success' && result && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <p className="font-bold text-green-800 text-lg">Reset Successful ✅</p>
                </div>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Table:</strong> {result.display_name}</p>
                  <p><strong>Leads Reset:</strong> {result.rows_reset.toLocaleString()}</p>
                  <p><strong>Time:</strong> {format(new Date(result.timestamp), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <p className="text-xs text-green-600">
                  These leads are now available for new campaigns.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-100"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Another Table
                </Button>
              </div>
            )}

            {/* Error */}
            {pageState === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="font-semibold text-red-800">Reset Failed ❌</p>
                </div>
                <p className="text-sm text-red-700">{errorMsg}</p>
                <Button variant="outline" className="w-full" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Reset Button */}
            {pageState === 'idle' && (
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
                disabled={!selectedTable}
                onClick={handleResetClick}
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Reset Sent Status
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0077b6]" />
                Recent Reset History (this session)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 border px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{item.display_name}</p>
                    <p className="text-xs text-gray-500">{format(new Date(item.timestamp), 'MMM dd, HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{item.rows_reset.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">leads reset</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
