import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact, ReportExportContext, ReportExportFormat, ReportExportSource, reportArtifact } from '@shared/report-output/report-output.models';
import { ReportExportController } from './report-export-controller';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const source = signal<ReportExportSource<{ title: string; rows: number[] }>>({ state: 'ready', key: 'first', value: { title: 'Report', rows: [0, 2] } });
  const download = vi.fn();
  TestBed.configureTestingModule({ providers: [{ provide: ReportFileDeliveryService, useValue: { download } }] });
  const flush = vi.fn(async () => true);
  const artifact = reportArtifact(new Blob(['file']), 'Report', 'pdf');
  const build = vi.fn(async (_format: ReportExportFormat, _snapshot: { title: string; rows: number[] }, _context: ReportExportContext) => artifact);
  const controller = TestBed.runInInjectionContext(() => new ReportExportController({ formats: ['pdf'], source, flush, build }));
  return { source, download, flush, build, artifact, controller };
}

describe('report export lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('detaches current content after saving, delivers once, and reports download initiation', async () => {
    const { controller, build, download, source, artifact } = setup();
    await controller.generate('pdf');
    expect(build).toHaveBeenCalledOnce();
    const current = source();
    if (current.state !== 'ready') throw new Error('Expected ready source');
    expect(build.mock.calls[0][1]).toEqual(current.value);
    expect(build.mock.calls[0][1]).not.toBe(current.value);
    expect(download).toHaveBeenCalledWith(artifact, expect.any(AbortSignal));
    expect(controller.busy()).toBe(false);
    expect(controller.state()).toMatchObject({ phase: 'idle', message: expect.stringContaining('Download started') });
  });

  it('blocks duplicates immediately, including while a save is pending', async () => {
    const { controller, flush, build, download } = setup();
    const pending = deferred<boolean>(); flush.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf');
    expect(controller.busy()).toBe(true);
    await controller.generate('pdf');
    expect(flush).toHaveBeenCalledOnce();
    pending.resolve(true); await operation;
    expect(build).toHaveBeenCalledOnce(); expect(download).toHaveBeenCalledOnce();
  });

  it('rejects failed saves and supports a fresh retry', async () => {
    const { controller, flush, build, download } = setup();
    flush.mockResolvedValueOnce(false);
    await controller.generate('pdf');
    expect(controller.state().phase).toBe('error'); expect(build).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
    await controller.generate('pdf'); expect(download).toHaveBeenCalledOnce();
  });

  it('cancels immediately when leaving Report while a flush is still pending', async () => {
    const { controller, flush, source, build, download } = setup();
    const pending = deferred<boolean>(); flush.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf');
    source.set({ state: 'unavailable', message: 'Open Report to export.' }); TestBed.tick();
    expect(controller.busy()).toBe(false);
    pending.resolve(true); await operation;
    expect(build).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });

  it('rechecks readiness after saving and does not build the previously ready snapshot', async () => {
    const { controller, flush, source, build } = setup();
    flush.mockImplementationOnce(async () => { source.set({ state: 'unavailable', message: 'Review changed inputs.' }); return true; });
    await controller.generate('pdf');
    expect(build).not.toHaveBeenCalled(); expect(controller.state()).toMatchObject({ phase: 'error', message: 'Review changed inputs.' });
  });

  it.each(['changed', 'unavailable', 'cancel', 'destroy'] as const)('suppresses a late artifact after %s', async reason => {
    const { controller, source, build, download, artifact } = setup();
    const pending = deferred<ReportArtifact>(); build.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf'); await Promise.resolve();
    if (reason === 'changed') source.set({ state: 'ready', key: 'second', value: { title: 'Changed', rows: [4] } });
    if (reason === 'unavailable') source.set({ state: 'unavailable', message: 'Left the report.' });
    if (reason === 'cancel') controller.cancel();
    if (reason === 'destroy') TestBed.resetTestingModule();
    if (reason !== 'destroy') TestBed.tick();
    pending.resolve(artifact); await operation;
    expect(download).not.toHaveBeenCalled(); expect(controller.busy()).toBe(false);
  });

  it('checks freshness synchronously before delivery without waiting for the cancellation effect', async () => {
    const { controller, source, build, artifact, download } = setup();
    build.mockImplementationOnce(async () => { source.set({ state: 'unavailable', message: 'Changed' }); return artifact; });
    await controller.generate('pdf'); expect(download).not.toHaveBeenCalled();
  });

  it('does not let cancelled serialization overwrite a subsequent export', async () => {
    const { controller, build, artifact, download } = setup();
    const pending = deferred<ReportArtifact>(); build.mockReturnValueOnce(pending.promise);
    const old = controller.generate('pdf'); await Promise.resolve(); controller.cancel();
    await controller.generate('pdf'); pending.resolve(artifact); await old;
    expect(download).toHaveBeenCalledOnce(); expect(controller.state().message).toContain('Download started');
  });

  it('preserves an export across a reprojected source with the same content key', async () => {
    const { controller, source, build, artifact, download } = setup();
    const pending = deferred<ReportArtifact>(); build.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf'); await Promise.resolve();
    source.set({ state: 'ready', key: 'first', value: { title: 'Report', rows: [0, 2] } }); TestBed.tick();
    pending.resolve(artifact); await operation; expect(download).toHaveBeenCalledOnce();
  });

  it('retains detached work through unrelated pending changes and waits for stable checks before delivery', async () => {
    const { controller, source, build, artifact, download } = setup();
    const pending = deferred<ReportArtifact>(); build.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf'); await Promise.resolve();
    source.set({ state: 'unavailable', transient: true, message: 'Workspace is saving.' }); TestBed.tick();
    expect(controller.busy()).toBe(true);
    pending.resolve(artifact); await Promise.resolve(); await Promise.resolve();
    expect(download).not.toHaveBeenCalled();
    source.set({ state: 'ready', key: 'first', value: { title: 'Report', rows: [0, 2] } }); TestBed.tick();
    await operation; expect(download).toHaveBeenCalledOnce();
  });

  it('suppresses delivery when pending checks settle with changed content', async () => {
    const { controller, source, build, artifact, download } = setup();
    const pending = deferred<ReportArtifact>(); build.mockReturnValueOnce(pending.promise);
    const operation = controller.generate('pdf'); await Promise.resolve();
    source.set({ state: 'unavailable', transient: true, message: 'Checking changes.' }); TestBed.tick();
    pending.resolve(artifact); await Promise.resolve(); await Promise.resolve();
    source.set({ state: 'ready', key: 'changed', value: { title: 'Report', rows: [5] } }); TestBed.tick();
    await operation; expect(download).not.toHaveBeenCalled();
  });

  it('uses one progress toast and replaces it with download or failure messaging', async () => {
    const { controller, build, artifact } = setup();
    const notifications = TestBed.inject(NotificationService);
    const pending = deferred<ReportArtifact>();
    build.mockImplementationOnce((_format, _snapshot, context) => {
      context.progress('Rendering charts…', 1, 3); return pending.promise;
    });
    const operation = controller.generate('pdf'); await Promise.resolve();
    expect(notifications.notifications()).toHaveLength(1);
    expect(notifications.notifications()[0]).toMatchObject({ tone: 'info', title: 'Rendering charts… (1 / 3)', durationMs: 0 });
    pending.resolve(artifact); await operation;
    expect(notifications.notifications()).toHaveLength(1);
    expect(notifications.notifications()[0]).toMatchObject({ tone: 'success', title: 'Download started' });
    notifications.dismissAll(); build.mockRejectedValueOnce(new Error('Missing chart'));
    await controller.generate('pdf');
    expect(notifications.notifications()).toHaveLength(1);
    expect(notifications.notifications()[0]).toMatchObject({ tone: 'danger', message: 'Missing chart' });
  });

  it('does not start a save from a retained capability after idle destruction', async () => {
    const { controller, flush } = setup();
    expect(controller.available()).toBe(true);
    TestBed.resetTestingModule();
    expect(controller.available()).toBe(false);
    await controller.generate('pdf'); expect(flush).not.toHaveBeenCalled();
  });

  it('surfaces generation failures and ignores unsupported or unavailable requests', async () => {
    const { controller, build, source, download } = setup();
    await controller.generate('pptx'); expect(build).not.toHaveBeenCalled();
    build.mockRejectedValueOnce(new Error('Chart could not be rendered. Try again.'));
    await controller.generate('pdf'); expect(controller.state()).toMatchObject({ phase: 'error', message: 'Chart could not be rendered. Try again.' });
    source.set({ state: 'unavailable', message: 'Review checks' }); await controller.generate('pdf');
    expect(build).toHaveBeenCalledOnce(); expect(download).not.toHaveBeenCalled();
  });
});
