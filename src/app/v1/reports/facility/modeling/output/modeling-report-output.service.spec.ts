import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PdfReportWriter, PdfReportOptions } from '@platform/reports/pdf-report-writer';
import { PptReportWriter, PptReportOptions } from '@platform/reports/ppt-report-writer';
import { PptDocument } from '@shared/report-output/ppt-document';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { ModelingReportExportSnapshot } from '@app/v1/reports/shared/modeling/output/modeling-report-output';
import { modelingExportFixture } from '@app/v1/reports/shared/modeling/testing/modeling-report-export-fixture';
import { FacilityModelingReportService } from '../modeling-report.service';
import { ModelingReportOutputService } from './modeling-report-output.service';

function setup() {
  const snapshot = signal<ModelingReportExportSnapshot | undefined>(modelingExportFixture());
  const stage = signal('report'), valid = signal(true), state = signal({ state: 'ready', message: '' });
  const flush = vi.fn(async () => true), download = vi.fn();
  const blob = new Blob(['%PDF-test'], { type: 'application/pdf' });
  const build = vi.fn(async (_document: ReportDocument, _options?: PdfReportOptions) => blob);
  const pptBlob = new Blob(['PK-test'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const pptBuild = vi.fn(async (_document: PptDocument, _options?: PptReportOptions) => pptBlob);
  TestBed.configureTestingModule({ providers: [ModelingReportOutputService,
    { provide: FacilityModelingReportService, useValue: { state, exportSnapshot: snapshot,
      context: { stage }, editor: { setupValid: valid, flush } } },
    { provide: PdfReportWriter, useValue: { build } },
    { provide: PptReportWriter, useValue: { build: pptBuild } },
    { provide: ReportFileDeliveryService, useValue: { download } }
  ] });
  const service = TestBed.inject(ModelingReportOutputService);
  return { service, output: service.output, snapshot, stage, valid, state, flush, download, build, blob, pptBuild, pptBlob };
}

const formats = ['pdf', 'pptx'] as const;
describe('Modeling export lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(formats)('flushes saved content and delivers %s without requiring model acknowledgment', async format => {
    const view = setup();
    view.flush.mockImplementationOnce(async () => {
      view.snapshot.update(snapshot => ({ ...snapshot!, name: 'Saved: Modeling?', view: { ...snapshot!.view, reportYear: 2024 } }));
      return true;
    });
    expect(view.output.formats).toEqual(formats);
    await view.output.generate(format);
    const build = format === 'pdf' ? view.build : view.pptBuild;
    expect(view.flush).toHaveBeenCalledOnce();
    expect(build.mock.calls[0][0].metadata.title).toBe('Saved: Modeling?');
    expect(build.mock.calls[0][1]).toMatchObject(format === 'pdf' ? { strictAssets: true, orientation: 'landscape', format: 'a4' }
      : { strictAssets: true, layout: 'wide', minimumTableFontSize: 12 });
    expect(view.download).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ blob: format === 'pdf' ? view.blob : view.pptBlob,
      fileName: `Saved- Modeling- — Plant A — Modeling — 2024.${format}` }), expect.any(AbortSignal));
    expect(view.output.state().message).toContain('Download started');
  });

  it('gates stage, setup, readiness, and switches while allowing selected diagnostic notices', () => {
    const view = setup();
    view.stage.set('setup'); expect(view.output.available()).toBe(false);
    view.stage.set('report'); view.valid.set(false); expect(view.output.available()).toBe(false);
    view.valid.set(true); view.snapshot.set(undefined); view.state.set({ state: 'loading', message: 'Preparing' });
    expect(view.service.source()).toMatchObject({ state: 'unavailable', transient: true });
    view.state.set({ state: 'error', message: 'Retry data' }); expect(view.output.unavailableReason()).toBe('Retry data');
    const snapshot = modelingExportFixture();
    snapshot.view.hasContent = false; view.snapshot.set(snapshot);
    expect(view.output.available()).toBe(false); expect(view.output.unavailableReason()).toContain('Choose report content');
    snapshot.view.hasContent = true;
    view.snapshot.set({ ...snapshot }); view.state.set({ state: 'ready', message: '' });
    expect(view.output.available()).toBe(true);
  });

  it.each(formats.flatMap(format => ['name', 'facility', 'group', 'predictor', 'year', 'settings', 'identity', 'stage', 'invalid', 'destroy', 'chart']
    .map(change => ({ format, change }))))(
    'suppresses late $format downloads when $change changes', async ({ format, change }) => {
      const view = setup(); let finish!: (blob: Blob) => void;
      const build = format === 'pdf' ? view.build : view.pptBuild;
      build.mockImplementationOnce(() => new Promise<Blob>(resolve => { finish = resolve; }));
      const generating = view.output.generate(format);
      await vi.waitFor(() => expect(build).toHaveBeenCalledOnce());
      let next = structuredClone(view.snapshot()!);
      if (change === 'name') next = { ...next, name: 'Renamed report' };
      if (change === 'facility') next = { ...next, scopeName: 'Renamed facility' };
      if (change === 'group') next.view.regression[0].groupName = 'Renamed group';
      if (change === 'predictor') next.view.regression[0].model!.SEPValidation[0].predictorVariable = 'Renamed predictor';
      if (change === 'year') next.view.reportYear++;
      if (change === 'settings') next.view.settings.includeExecutiveSummary = false;
      if (change === 'chart') Object.assign(next.view.regression[0].chart!.monthly[0], { modeledEnergy: 12345 });
      if (change === 'identity') next = { ...next, identity: 'account:other:report' };
      if (change === 'stage') view.stage.set('setup');
      if (change === 'invalid') view.valid.set(false);
      view.snapshot.set(next); TestBed.tick();
      if (change === 'destroy') TestBed.resetTestingModule();
      finish(view.blob); await generating;
      expect(view.download).not.toHaveBeenCalled();
      expect(build.mock.calls[0][1]!.signal!.aborted).toBe(true);
    }
  );

  it.each(formats)('blocks requests for either format during %s generation and retains detached work across irrelevant changes', async format => {
    const view = setup(); let finish!: (blob: Blob) => void;
    const build = format === 'pdf' ? view.build : view.pptBuild;
    build.mockImplementationOnce(() => new Promise<Blob>(resolve => { finish = resolve; }));
    const generating = view.output.generate(format);
    await vi.waitFor(() => expect(build).toHaveBeenCalledOnce());
    const original = JSON.stringify(build.mock.calls[0][0]), next = structuredClone(view.snapshot()!);
    next.view.groups[0].group.regressionConstant = 999;
    view.snapshot.set(next); TestBed.tick();
    await view.output.generate('pdf'); await view.output.generate('pptx');
    expect(view.build.mock.calls.length + view.pptBuild.mock.calls.length).toBe(1);
    expect(JSON.stringify(build.mock.calls[0][0])).toEqual(original);
    finish(view.blob); await generating;
    expect(view.download).toHaveBeenCalledOnce();
  });

  it.each(formats)('reports failed saves and %s writer errors and allows retry without partial delivery', async format => {
    const view = setup(); view.flush.mockResolvedValueOnce(false);
    const build = format === 'pdf' ? view.build : view.pptBuild;
    await view.output.generate(format); expect(build).not.toHaveBeenCalled();
    build.mockRejectedValueOnce(new Error('Writer failed'));
    await view.output.generate(format);
    expect(view.output.state()).toMatchObject({ phase: 'error', message: 'Writer failed' });
    expect(view.download).not.toHaveBeenCalled();
    await view.output.generate(format); expect(view.download).toHaveBeenCalledOnce();
  });

  it('invalidates changes to original Unicode labels even when the PDF-normalized text is identical', () => {
    const view = setup();
    view.snapshot.update(snapshot => {
      const next = structuredClone(snapshot!); next.view.regression[0].groupName = 'CO₂'; return next;
    });
    const before = view.service.source();
    view.snapshot.update(snapshot => {
      const next = structuredClone(snapshot!); next.view.regression[0].groupName = 'CO2'; return next;
    });
    const after = view.service.source();
    expect(before.state === 'ready' && after.state === 'ready' && before.key !== after.key).toBe(true);
  });
});
