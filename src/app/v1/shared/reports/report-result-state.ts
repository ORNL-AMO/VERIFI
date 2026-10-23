/** Common presentation states; features retain their typed result and readiness rules. */
export interface ReportResultState<T> {
  readonly state: 'idle' | 'waiting' | 'loading' | 'review-required' | 'ready' | 'error';
  readonly key: string;
  readonly message?: string;
  readonly value?: T;
}
