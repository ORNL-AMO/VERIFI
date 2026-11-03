import { DestroyRef, EffectRef, Injector, Signal, computed, effect, inject, signal } from '@angular/core';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact, ReportExportContext, ReportExportFormat, ReportExportSource } from '@shared/report-output/report-output.models';
import { ReportOutputCapability, ReportOutputState } from './report-output.models';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';

export interface ReportExportAdapter<T> {
  readonly formats: readonly ReportExportFormat[];
  readonly source: Signal<ReportExportSource<T>>;
  flush(): Promise<boolean>;
  build(format: ReportExportFormat, snapshot: T, context: ReportExportContext): Promise<ReportArtifact>;
}

interface ActiveExport { readonly controller: AbortController; readonly notificationId: string; readonly key?: string; }

/** One instance belongs to the feature injector, alongside its editor and result. */
export class ReportExportController<T> implements ReportOutputCapability {
  private readonly delivery = inject(ReportFileDeliveryService);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly active = signal<ActiveExport | undefined>(undefined);
  private readonly status = signal<ReportOutputState>({ phase: 'idle', message: '' });
  private readonly destroyed = signal(false);
  readonly formats: readonly ReportExportFormat[];
  readonly state = this.status.asReadonly();
  readonly busy = computed(() => !!this.active());
  readonly available = computed(() => !this.destroyed() && !this.busy() && this.adapter.source().state === 'ready');
  readonly unavailableReason = computed(() => {
    const source = this.adapter.source();
    return this.busy() ? this.status().message : source.state === 'unavailable' ? source.message : '';
  });

  constructor(private readonly adapter: ReportExportAdapter<T>) {
    this.formats = adapter.formats;
    effect(() => {
      const operation = this.active(), source = this.adapter.source();
      if (operation && (source.state === 'unavailable' ? !source.transient
        : operation.key !== undefined && source.key !== operation.key)) this.cancel(false);
    });
    inject(DestroyRef).onDestroy(() => { this.cancel(false); this.destroyed.set(true); });
  }

  async generate(format: ReportExportFormat): Promise<void> {
    if (!this.available() || !this.formats.includes(format)) return;
    const operation: ActiveExport = { controller: new AbortController(),
      notificationId: this.notifications.info('Preparing report…', { durationMs: 0 }).id };
    this.active.set(operation);
    this.status.set({ phase: 'preparing', message: 'Preparing report…' });
    try {
      if (!await this.adapter.flush()) throw new Error('Report changes could not be saved. Save or discard your changes, then try again.');
      if (!this.isActive(operation)) return;
      const source = this.adapter.source();
      if (source.state !== 'ready') throw new Error(source.message);
      const snapshot = structuredClone(source.value);
      const keyed = { ...operation, key: source.key };
      this.active.set(keyed);
      const artifact = await this.adapter.build(format, snapshot, {
        signal: operation.controller.signal,
        progress: (message, completed, total) => {
          this.publish(operation, { phase: 'building', message, completed, total });
        }
      });
      await this.waitForReadiness(keyed);
      this.assertCurrent(keyed);
      this.status.set({ phase: 'delivering', message: 'Starting download…' });
      this.delivery.download(artifact, operation.controller.signal);
      this.status.set({ phase: 'idle', message: 'Download started. Check your downloads for the report.' });
      this.notifications.dismiss(operation.notificationId);
      this.notifications.success('Download started', { message: `${artifact.fileName}. Check your downloads for the report.` });
    } catch (error) {
      if (this.isActive(operation) && !operation.controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'The report could not be generated. Try again.';
        this.status.set({ phase: 'error', message });
        this.notifications.dismiss(operation.notificationId);
        this.notifications.danger('Report could not be generated', { message });
      }
    } finally {
      this.notifications.dismiss(operation.notificationId);
      if (this.isActive(operation)) this.active.set(undefined);
    }
  }

  cancel(notify = true): void {
    const operation = this.active();
    if (!operation) return;
    operation.controller.abort();
    this.notifications.dismiss(operation.notificationId);
    this.active.set(undefined);
    this.status.set({ phase: 'idle', message: 'Report generation cancelled.' });
    if (notify && !this.destroyed()) this.notifications.info('Report generation cancelled');
  }

  private isActive(operation: ActiveExport): boolean {
    return !this.destroyed() && this.active()?.controller === operation.controller;
  }

  private assertCurrent(operation: ActiveExport): void {
    const source = this.adapter.source();
    if (!this.isActive(operation) || source.state !== 'ready' || source.key !== operation.key) {
      operation.controller.abort();
      if (this.isActive(operation)) this.cancel(false);
    }
    operation.controller.signal.throwIfAborted();
  }

  private publish(operation: ActiveExport, state: ReportOutputState): void {
    if (!this.isActive(operation)) return;
    this.status.set(state);
    const count = state.completed != null && state.total != null ? ` (${state.completed} / ${state.total})` : '';
    this.notifications.update(operation.notificationId, { title: state.message + count });
  }

  /** Keep detached work across unrelated saves, but never deliver against unstable checks. */
  private async waitForReadiness(operation: ActiveExport): Promise<void> {
    operation.controller.signal.throwIfAborted();
    const source = this.adapter.source();
    if (source.state !== 'unavailable' || !source.transient) return;
    this.publish(operation, { phase: 'preparing', message: 'Waiting for current report checks…' });
    await new Promise<void>((resolve, reject) => {
      let watcher: EffectRef | undefined, settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true; clearTimeout(timer); watcher?.destroy();
        operation.controller.signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(operation.controller.signal.reason);
      const timer = setTimeout(() => finish(new Error('Current report checks did not finish. Wait for the report to become ready, then try again.')), 120000);
      operation.controller.signal.addEventListener('abort', abort, { once: true });
      watcher = effect(() => {
        const current = this.adapter.source();
        if (current.state === 'ready' || !current.transient) finish();
      }, { injector: this.injector, manualCleanup: true });
      if (operation.controller.signal.aborted) abort();
    });
  }
}
