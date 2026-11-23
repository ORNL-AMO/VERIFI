import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PdfReportOptions, PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { AccountEmissionFactorsReportService } from '../emission-factors-report.service';
import { AccountEmissionFactorsReportSnapshot } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';
import { accountEmissionFactorsOutputSnapshot } from '../testing/emission-factors-fixtures';
import { AccountEmissionFactorsReportOutputService } from './emission-factors-report-output.service';

function setup() {
  const snapshot = signal<AccountEmissionFactorsReportSnapshot | undefined>(accountEmissionFactorsOutputSnapshot());
  const stage = signal('report'), valid = signal(true), state = signal({ state: 'ready', message: '' });
  const flush = vi.fn(async () => true), download = vi.fn();
  const build = vi.fn(async (_document: ReportDocument, _options?: PdfReportOptions) => new Blob(['%PDF-test'], { type: 'application/pdf' }));
  TestBed.configureTestingModule({ providers: [AccountEmissionFactorsReportOutputService,
    { provide: AccountEmissionFactorsReportService, useValue: { exportSnapshot: snapshot, context: { stage }, state, editor: { setupValid: valid, flush } } },
    { provide: PdfReportWriter, useValue: { build } }, { provide: ReportFileDeliveryService, useValue: { download } }
  ] });
  const service = TestBed.inject(AccountEmissionFactorsReportOutputService);
  return { service, output: service.output, snapshot, stage, valid, state, flush, build, download };
}
describe('Emission Factors PDF lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('saves first, detaches the saved snapshot, and uses shared strict PDF rendering and delivery', async () => {
    const view = setup();
    view.flush.mockImplementationOnce(async () => { view.snapshot.update(value => ({ ...value!, name: 'Saved factors' })); return true; });
    await view.output.generate('pdf');
    expect(view.flush).toHaveBeenCalledOnce(); expect(view.build).toHaveBeenCalledOnce();
    expect(view.build.mock.calls[0][0].metadata.title).toBe('Saved factors');
    expect(view.build.mock.calls[0][1]).toMatchObject({ orientation: 'landscape', format: 'a4', strictAssets: true });
    expect(view.download).toHaveBeenCalledWith(expect.objectContaining({ fileName: expect.stringContaining('Saved factors'), mimeType: 'application/pdf' }), expect.any(AbortSignal));
  });
  it('gates Setup, invalid, loading and empty reports', () => {
    const view = setup(); view.stage.set('setup'); expect(view.output.available()).toBe(false);
    view.stage.set('report'); view.valid.set(false); expect(view.output.available()).toBe(false);
    view.valid.set(true); view.snapshot.set(undefined); view.state.set({ state: 'loading', message: 'Preparing' });
    expect(view.service.source()).toMatchObject({ state: 'unavailable', transient: true });
    const snapshot = accountEmissionFactorsOutputSnapshot(); view.snapshot.set({ ...snapshot, results: snapshot.results.map(result => ({ ...result, electricity: [], other: [] })) });
    expect(view.output.available()).toBe(false);
  });
  it.each(['cancel', 'period', 'facility', 'stage', 'destroy'] as const)('prevents late delivery after %s and blocks duplicate exports', async change => {
    const view = setup(); let finish!: (blob: Blob) => void;
    view.build.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const generating = view.output.generate('pdf');
    await vi.waitFor(() => expect(view.build).toHaveBeenCalledOnce()); await view.output.generate('pdf');
    expect(view.build).toHaveBeenCalledOnce();
    if (change === 'cancel') view.output.cancel();
    if (change === 'period') view.snapshot.update(value => ({ ...value!, endYear: 2025 }));
    if (change === 'facility') view.snapshot.update(value => ({ ...value!, identity: { ...value!.identity, accountGuid: 'another' } }));
    if (change === 'stage') view.stage.set('setup');
    if (change === 'destroy') TestBed.resetTestingModule(); else TestBed.tick();
    finish(new Blob(['late'])); await generating;
    expect(view.download).not.toHaveBeenCalled(); expect(view.build.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it('reports writer/save failures and permits retry without delivering partial files', async () => {
    const view = setup(); view.flush.mockResolvedValueOnce(false); await view.output.generate('pdf');
    expect(view.build).not.toHaveBeenCalled(); expect(view.output.state().phase).toBe('error');
    view.build.mockRejectedValueOnce(new Error('PDF failed')); await view.output.generate('pdf');
    expect(view.output.state().message).toBe('PDF failed'); expect(view.download).not.toHaveBeenCalled();
    await view.output.generate('pdf'); expect(view.download).toHaveBeenCalledOnce();
  });
});
