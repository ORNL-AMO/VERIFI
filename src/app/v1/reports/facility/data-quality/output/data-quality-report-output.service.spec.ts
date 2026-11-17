import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PdfReportWriter, PdfReportOptions } from '@platform/reports/pdf-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { ChartSection, TableSection } from '@shared/report-output/report-section.model';
import { EChartsImageService, PDF_CHART_IMAGE_OPTIONS } from '@app/v1/shared/charts/echarts-image.service';
import { DataQualityReportService } from '../data-quality-report.service';
import {
  dataQualityPdfSnapshot, dataQualityPredictorReadingsSnapshot
} from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportSnapshot, buildDataQualityReportSnapshot } from '../data-quality-report.view';
import { METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';
import { DataQualityReportOutputService } from './data-quality-report-output.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  const snapshot = signal<DataQualityReportSnapshot | undefined>(dataQualityPdfSnapshot());
  const stage = signal('report'), valid = signal(true), canEdit = signal(true);
  const state = signal({ state: 'ready', message: '' });
  const flush = vi.fn(async () => true), download = vi.fn(), capture = vi.fn(async () => 'chart-image');
  const blob = new Blob(['%PDF-test'], { type: 'application/pdf' });
  const build = vi.fn(async (document: ReportDocument, _options?: PdfReportOptions) => {
    for (const section of document.sections) {
      if (section.type === 'chart') await (section as ChartSection).imageDataProvider?.();
    }
    return blob;
  });
  TestBed.configureTestingModule({ providers: [DataQualityReportOutputService,
    { provide: DataQualityReportService, useValue: { state, exportSnapshot: snapshot, context: { stage },
      editor: { setupValid: valid, canEdit, flush } } },
    { provide: PdfReportWriter, useValue: { build } },
    { provide: EChartsImageService, useValue: { capture } },
    { provide: ReportFileDeliveryService, useValue: { download } }
  ] });
  const service = TestBed.inject(DataQualityReportOutputService);
  return { service, output: service.output, snapshot, stage, valid, canEdit, state,
    flush, download, capture, build, blob };
}

describe('Data Quality PDF lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('exports saved detached content through strict landscape A4 rendering and shared delivery', async () => {
    const view = setup();
    view.flush.mockImplementationOnce(async () => {
      view.snapshot.update(snapshot => snapshot && { ...snapshot, name: 'Saved: Quality?' });
      return true;
    });
    expect(view.output.formats).toEqual(['pdf']);
    await view.output.generate('pdf');
    expect(view.flush).toHaveBeenCalledOnce();
    expect(view.build).toHaveBeenCalledOnce();
    expect(view.build.mock.calls[0][1]).toMatchObject({ orientation: 'landscape', format: 'a4', strictAssets: true });
    expect(view.capture).toHaveBeenCalledTimes(6);
    expect(view.capture).toHaveBeenCalledWith(expect.any(Object), PDF_CHART_IMAGE_OPTIONS, expect.any(AbortSignal));
    expect(view.download).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      blob: view.blob, fileName: expect.stringMatching(/^Saved- Quality-.*Data Quality\.pdf$/),
      mimeType: 'application/pdf'
    }), expect.any(AbortSignal));
    expect(view.output.state().message).toContain('Download started');
    expect(view.output.busy()).toBe(false);
  });

  it('gates stage, selection, readiness, and applicable content without gating clean read-only reports', async () => {
    const view = setup();
    view.stage.set('setup'); expect(view.output.available()).toBe(false);
    view.stage.set('report'); view.valid.set(false); expect(view.output.available()).toBe(false);
    view.valid.set(true); view.snapshot.set(undefined); view.state.set({ state: 'loading', message: 'Preparing' });
    expect(view.service.source()).toMatchObject({ state: 'unavailable', transient: true });
    view.state.set({ state: 'error', message: 'Retry reading data' });
    expect(view.output.unavailableReason()).toBe('Retry reading data');
    view.snapshot.set(dataQualityPdfSnapshot()); view.state.set({ state: 'ready', message: '' });
    view.snapshot.update(snapshot => {
      const updated = structuredClone(snapshot!);
      for (const flag of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS]) updated.settings[flag] = false;
      updated.settings.includeAnnualTotalsTable = false;
      return updated;
    });
    expect(view.output.available()).toBe(false);
    expect(view.output.unavailableReason()).toContain('Choose report content');
    view.snapshot.set(dataQualityPdfSnapshot()); view.canEdit.set(false);
    expect(view.output.available()).toBe(true);
    await view.output.generate('pdf');
    expect(view.download).toHaveBeenCalledOnce();
  });

  it('blocks duplicate requests, detaches inputs, and never delivers after cancellation', async () => {
    const view = setup(), pending = deferred<string>();
    view.capture.mockImplementationOnce(() => pending.promise);
    const generating = view.output.generate('pdf');
    await vi.waitFor(() => expect(view.capture).toHaveBeenCalledOnce());
    await view.output.generate('pdf');
    expect(view.build).toHaveBeenCalledOnce();
    const table = view.build.mock.calls[0][0].sections
      .find((section): section is TableSection => section.type === 'table')!;
    view.snapshot()!.results.meters[0].meterData[0].totalCost = 999;
    expect(table.type === 'table' && table.rows[1].includes('$65')).toBe(true);
    view.output.cancel(); pending.resolve('late image'); await generating;
    expect(view.download).not.toHaveBeenCalled();
    expect(view.build.mock.calls[0][1]!.signal!.aborted).toBe(true);
    expect(view.output.busy()).toBe(false);
  });

  it('retains an active export when unprinted facility metadata changes', async () => {
    const view = setup(), pending = deferred<string>(), workspace = dataQualityPredictorReadingsSnapshot();
    const report = workspace.facilityReports[0], facility = workspace.facilities[0], prepared = dataQualityPdfSnapshot();
    const snapshot = () => buildDataQualityReportSnapshot(
      report, facility, prepared.settings, prepared.results);
    view.snapshot.set(snapshot());
    const originalKey = view.service.source();
    view.capture.mockImplementationOnce(() => pending.promise);
    const generating = view.output.generate('pdf');
    await vi.waitFor(() => expect(view.capture).toHaveBeenCalledOnce());
    facility.notes = 'Updated internal notes';
    facility.address = '123 New Street';
    view.snapshot.set(snapshot()); TestBed.tick();
    try {
      expect(view.service.source()).toEqual(originalKey);
      expect(view.output.busy()).toBe(true);
    } finally {
      pending.resolve('chart image'); await generating;
    }
    expect(view.download).toHaveBeenCalledOnce();
    expect(view.build.mock.calls[0][1]!.signal!.aborted).toBe(false);
  });

  it.each(['name', 'facility-name', 'readings', 'settings', 'identity', 'stage', 'selection'] as const)(
    'suppresses stale delivery when %s changes', async change => {
      const view = setup(), pending = deferred<string>();
      view.capture.mockImplementationOnce(() => pending.promise);
      const generating = view.output.generate('pdf');
      await vi.waitFor(() => expect(view.capture).toHaveBeenCalledOnce());
      const snapshot = structuredClone(view.snapshot()!);
      if (change === 'name') snapshot.name = 'Another name';
      if (change === 'facility-name') snapshot.facility.name = 'Another facility name';
      if (change === 'readings') snapshot.results.meters[0].meterData[0].totalCost = 999;
      if (change === 'settings') snapshot.settings.includeMeterStatisticsTable = false;
      if (change === 'identity') snapshot.identity.reportGuid = 'another-report';
      if (change === 'stage') view.stage.set('setup');
      if (change === 'selection') view.valid.set(false);
      view.snapshot.set(snapshot); TestBed.tick();
      pending.resolve('late image'); await generating;
      expect(view.download).not.toHaveBeenCalled();
      expect(view.output.busy()).toBe(false);
    }
  );

  it('blocks failed saves, reports capture errors, and permits retry without partial downloads', async () => {
    const view = setup();
    view.flush.mockResolvedValueOnce(false);
    await view.output.generate('pdf');
    expect(view.build).not.toHaveBeenCalled();
    expect(view.output.state().message).toContain('could not be saved');
    view.capture.mockRejectedValueOnce(new Error('Chart capture failed'));
    await view.output.generate('pdf');
    expect(view.output.state()).toMatchObject({ phase: 'error', message: 'Chart capture failed' });
    expect(view.download).not.toHaveBeenCalled();
    await view.output.generate('pdf');
    expect(view.download).toHaveBeenCalledOnce();
    expect(view.output.busy()).toBe(false);
  });

  it('cleans up pending exports when the report injector is destroyed', async () => {
    const view = setup(), pending = deferred<string>();
    view.capture.mockImplementationOnce(() => pending.promise);
    const generating = view.output.generate('pdf');
    await vi.waitFor(() => expect(view.capture).toHaveBeenCalledOnce());
    TestBed.resetTestingModule();
    pending.resolve('late image'); await generating;
    expect(view.download).not.toHaveBeenCalled();
  });
});
