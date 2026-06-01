'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, Search, Mail } from 'lucide-react';
import { useBackgroundTasks, type BackgroundTask } from './background-task-context';

function TaskCard({ task, onDismiss }: { task: BackgroundTask; onDismiss: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (task.status !== 'running') return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - task.startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [task.status, task.startTime]);

  // Simulate progress 0→92% over estimatedSeconds, then freeze until done
  const rawPct = task.status === 'running'
    ? Math.min(Math.round((elapsed / task.estimatedSeconds) * 92), 92)
    : task.status === 'success' ? 100 : 100;

  const isRunning = task.status === 'running';
  const isSuccess = task.status === 'success';
  const isError   = task.status === 'error';

  const barColor = isError ? 'bg-red-500' : isSuccess ? 'bg-green-500' : 'bg-[#0077b6]';
  const bgColor  = isError ? 'bg-red-50 border-red-200' : isSuccess ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';

  return (
    <div className={`rounded-xl border shadow-lg px-4 py-3 text-sm ${bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isSuccess && <CheckCircle className="h-4 w-4 text-green-600" />}
            {isError   && <XCircle    className="h-4 w-4 text-red-500" />}
            {isRunning && (
              task.type === 'CAMPAIGN'
                ? <Mail   className="h-4 w-4 text-[#0077b6] animate-pulse" />
                : <Search className="h-4 w-4 text-[#0077b6] animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {isRunning ? (task.type === 'CAMPAIGN' ? 'Generating email...' : 'Scraping leads...') : task.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRunning  && 'You can browse freely — we\'ll notify you when done'}
              {isSuccess  && (task.resultMessage || 'Completed successfully')}
              {isError    && (task.error || 'Something went wrong')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <span className="text-xs font-bold text-[#0077b6]">{rawPct}%</span>
          )}
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${rawPct}%` }}
        />
      </div>
    </div>
  );
}

export function BackgroundTaskBar() {
  const { tasks, dismissTask } = useBackgroundTasks();

  const visible = tasks.filter((t) => !t.dismissed);
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2 pointer-events-none">
      {visible.map((task) => (
        <div key={task.id} className="pointer-events-auto">
          <TaskCard task={task} onDismiss={() => dismissTask(task.id)} />
        </div>
      ))}
    </div>
  );
}
