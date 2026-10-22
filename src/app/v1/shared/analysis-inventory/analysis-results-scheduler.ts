import { Observable, Subscription, finalize } from 'rxjs';

export interface AnalysisResultJob { readonly accountGuid: string; readonly key: string; readonly fingerprint: string; }
export interface AnalysisResultInput<State, Job extends AnalysisResultJob> {
  readonly states: Readonly<Record<string, State>>;
  readonly jobs: readonly Job[];
}
interface ScheduledJob<State, Job> { readonly job: Job; subscription?: Subscription; state?: State; }

/** Retain matching jobs as demand changes; terminate stale work before releasing either Worker slot. */
export function scheduleAnalysisResults<State, Job extends AnalysisResultJob>(
  inputs: Observable<AnalysisResultInput<State, Job>>,
  calculate: (job: Job) => Observable<{ readonly key: string; readonly state: State }>
): Observable<Readonly<Record<string, State>>> {
  return new Observable(subscriber => {
    const scheduled = new Map<string, ScheduledJob<State, Job>>();
    let states: Readonly<Record<string, State>> = {};
    let active = 0;
    let reconciling = false;
    let draining = false;

    const drain = () => {
      if (subscriber.closed || reconciling || draining) return;
      draining = true;
      try {
        for (const item of scheduled.values()) {
          if (active >= 2) break;
          if (item.subscription || item.state) continue;
          const subscription = new Subscription();
          item.subscription = subscription;
          active++;
          subscription.add(calculate(item.job).pipe(finalize(() => {
            // runWorker tears down before this finalizer releases the slot.
            active--;
            item.subscription = undefined;
            drain();
          })).subscribe(update => {
            if (subscriber.closed || scheduled.get(update.key) !== item) return;
            item.state = update.state;
            states = { ...states, [update.key]: update.state };
            subscriber.next(states);
          }));
        }
      } finally { draining = false; }
    };

    const inputSubscription = inputs.subscribe({
      next: input => {
        reconciling = true;
        try {
          const desired = new Map(input.jobs.map(job => [job.key, job]));
          for (const [key, item] of scheduled) {
            const next = desired.get(key);
            if (next?.accountGuid === item.job.accountGuid && next.fingerprint === item.job.fingerprint) continue;
            scheduled.delete(key);
            item.subscription?.unsubscribe();
          }
          for (const job of input.jobs) {
            if (!scheduled.has(job.key)) scheduled.set(job.key, { job });
          }
          states = { ...input.states, ...Object.fromEntries([...scheduled].flatMap(([key, item]) => item.state ? [[key, item.state]] : [])) };
          subscriber.next(states);
        } finally { reconciling = false; }
        drain();
      },
      error: error => subscriber.error(error)
    });
    return () => {
      inputSubscription.unsubscribe();
      for (const item of scheduled.values()) item.subscription?.unsubscribe();
      scheduled.clear();
    };
  });
}
