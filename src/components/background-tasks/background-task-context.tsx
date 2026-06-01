'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface BackgroundTask {
  id: string;
  type: 'CAMPAIGN' | 'SCRAPER';
  name: string;
  startTime: number;
  estimatedSeconds: number; // used to simulate progress
  status: 'running' | 'success' | 'error';
  resultMessage?: string;
  error?: string;
  dismissed?: boolean;
}

interface StartTaskOptions {
  name: string;
  estimatedSeconds: number;
  run: () => Promise<{ message: string }>;
  onSuccess?: () => void;
}

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[];
  startTask: (type: BackgroundTask['type'], opts: StartTaskOptions) => string;
  dismissTask: (id: string) => void;
  clearCompleted: () => void;
}

export const BackgroundTaskContext = createContext<BackgroundTaskContextValue>({
  tasks: [],
  startTask: () => '',
  dismissTask: () => {},
  clearCompleted: () => {},
});

export const useBackgroundTasks = () => useContext(BackgroundTaskContext);

let _id = 0;

export function BackgroundTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const callbacksRef = useRef<Record<string, (() => void) | undefined>>({});

  const startTask = useCallback((type: BackgroundTask['type'], opts: StartTaskOptions): string => {
    const id = `task_${++_id}_${Date.now()}`;
    const task: BackgroundTask = {
      id,
      type,
      name: opts.name,
      startTime: Date.now(),
      estimatedSeconds: opts.estimatedSeconds,
      status: 'running',
    };

    setTasks((prev) => [...prev, task]);

    if (opts.onSuccess) callbacksRef.current[id] = opts.onSuccess;

    // Run in background — survives page navigation
    opts.run()
      .then(({ message }) => {
        setTasks((prev) =>
          prev.map((t) => t.id === id ? { ...t, status: 'success', resultMessage: message } : t)
        );
        callbacksRef.current[id]?.();
        delete callbacksRef.current[id];
      })
      .catch((err: Error) => {
        setTasks((prev) =>
          prev.map((t) => t.id === id ? { ...t, status: 'error', error: err.message } : t)
        );
        delete callbacksRef.current[id];
      });

    return id;
  }, []);

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === 'running'));
  }, []);

  return (
    <BackgroundTaskContext.Provider value={{ tasks, startTask, dismissTask, clearCompleted }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}
