import { Signal, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ReportResultState } from './report-result-state';

/** Features prepare readiness and content identity; this controller does no report selection or calculation policy. */
export interface ReportResultRequest<TValue, TRequest> {
  readonly state: ReportResultState<TValue>;
  readonly calculation?: { readonly content: string; readonly request: TRequest };
}

export interface ReportResultAdapter<TValue, TRequest, TResult> {
  readonly request: Signal<ReportResultRequest<TValue, TRequest>>;
  readonly loadingMessage: string;
  readonly waitingMessage: string;
  execute(request: TRequest): Observable<TResult>;
  project(value: TValue, result: TResult): TValue;
}

/** One current result and one active calculation, scoped to the owning report session's injection context. */
export class ReportResultController<TValue, TRequest, TResult> {
  private readonly attempt = signal(0);
  private cache?: { readonly content: string; readonly result: TResult };
  private readonly input = computed(() => {
    const request = this.adapter.request();
    return { ...request, key: JSON.stringify([request.state.key, request.state.state,
      request.state.message, request.calculation?.content, this.attempt()]) };
  });
  private readonly result = toSignal(toObservable(this.input).pipe(
    distinctUntilChanged((previous, current) => previous.key === current.key),
    switchMap(input => {
      const calculation = input.calculation;
      if (input.state.state !== 'ready' || input.state.value === undefined || !calculation) {
        return of<ReportResultState<TResult>>({ key: input.key, state: input.state.state, message: input.state.message });
      }
      if (this.cache?.content === calculation.content) {
        return of<ReportResultState<TResult>>({ key: input.key, state: 'ready', value: this.cache.result });
      }
      return concat(of<ReportResultState<TResult>>({ key: input.key, state: 'loading', message: this.adapter.loadingMessage }),
        defer(() => this.adapter.execute(calculation.request)).pipe(
          map((result): ReportResultState<TResult> => {
            this.cache = { content: calculation.content, result };
            return { key: input.key, state: 'ready', value: result };
          }),
          catchError(error => of<ReportResultState<TResult>>({ key: input.key, state: 'error',
            message: error instanceof Error ? error.message : 'Report processing failed. Try again.' }))
        ));
    })
  ), { initialValue: { key: '', state: 'idle' } as ReportResultState<TResult> });

  readonly state = computed<ReportResultState<TValue>>(() => {
    const input = this.input(), result = this.result();
    if (result.key !== input.key) return { key: input.key,
      state: input.state.state === 'error' ? 'error' : 'waiting',
      message: input.state.message ?? this.adapter.waitingMessage };
    if (input.state.state !== 'ready' || input.state.value === undefined || !input.calculation) return { ...input.state, key: input.key };
    return { key: input.key, state: result.state, message: result.message,
      ...(result.state === 'ready' && result.value !== undefined ? { value: this.adapter.project(input.state.value, result.value) } : {}) };
  });

  constructor(private readonly adapter: ReportResultAdapter<TValue, TRequest, TResult>) { }

  retry(): void {
    this.cache = undefined;
    this.attempt.update(value => value + 1);
  }
}
