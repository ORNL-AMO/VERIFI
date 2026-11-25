import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ModelingReportExportSnapshot } from '@app/v1/reports/shared/modeling/output/modeling-report-output';
import { modelingExportFixture } from '@app/v1/reports/shared/modeling/testing/modeling-report-export-fixture';
import { AccountModelingReportService } from '../modeling-report.service';
import { AccountModelingReportOutputService } from './modeling-report-output.service';
import { ModelingReportWorkbookWriter } from '@platform/reports/modeling-report-workbook-writer.service';

const buildWorkbook = vi.fn();

function setup() {
  const original = modelingExportFixture(); original.view.scope = 'account';
  const snapshot = signal<ModelingReportExportSnapshot>({ ...original, scopeName: 'Portfolio' });
  const stage = signal('report'), flush = vi.fn(async () => true), download = vi.fn();
  buildWorkbook.mockReset().mockResolvedValue(new Blob(['workbook']));
  TestBed.configureTestingModule({ providers: [AccountModelingReportOutputService,
    { provide: ModelingReportWorkbookWriter, useValue: { build: buildWorkbook } },
    { provide: AccountModelingReportService, useValue: { state: signal({ state: 'ready' }), exportSnapshot: snapshot,
      context: { stage }, editor: { setupValid: signal(true), flush } } },
    { provide: ReportFileDeliveryService, useValue: { download } }
  ] });
  const service = TestBed.inject(AccountModelingReportOutputService);
  return { snapshot, stage, flush, download, service, output: service.output };
}
describe('account Modeling Excel export lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('offers Excel and flushes edits before exporting the detached executive summary', async () => {
    const f = setup(); expect(f.output.formats).toEqual(['pdf', 'pptx', 'xlsx']);
    f.flush.mockImplementationOnce(async () => { f.snapshot.update(value => ({ ...value, name: 'Saved name' })); return true; });
    await f.output.generate('xlsx');
    expect(f.flush).toHaveBeenCalledOnce(); expect(buildWorkbook).toHaveBeenCalledOnce();
    expect(buildWorkbook.mock.calls[0][0]).toMatchObject({ headers: expect.arrayContaining(['Constant', 'Coefficient 1 Value']),
      rows: [expect.arrayContaining(['Plant A', 'Main meters'])] });
    expect(f.download).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'Saved name_Executive_Summary_VERIFI.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), expect.any(AbortSignal));
  });
  it.each(['precision', 'stage', 'destroy'] as const)('prevents duplicate exports and suppresses late delivery after %s changes', async change => {
    const f = setup(); let resolve!: (blob: Blob) => void;
    buildWorkbook.mockImplementationOnce(() => new Promise<Blob>(done => resolve = done));
    const generating = f.output.generate('xlsx');
    await vi.waitFor(() => expect(buildWorkbook).toHaveBeenCalledOnce());
    await f.output.generate('xlsx'); expect(buildWorkbook).toHaveBeenCalledOnce();
    if (change === 'precision') {
      const next = structuredClone(f.snapshot()); next.view.groups[0].model!.coef[0] += 0.00000001;
      f.snapshot.set(next);
    } else if (change === 'stage') f.stage.set('setup');
    else TestBed.resetTestingModule();
    resolve(new Blob(['late workbook'])); await generating;
    expect(f.download).not.toHaveBeenCalled();
  });
  it('reports save and writer failures and permits retry', async () => {
    const f = setup(); f.flush.mockResolvedValueOnce(false);
    await f.output.generate('xlsx'); expect(f.output.state().phase).toBe('error'); expect(buildWorkbook).not.toHaveBeenCalled();
    buildWorkbook.mockRejectedValueOnce(new Error('Workbook failed'));
    await f.output.generate('xlsx'); expect(f.output.state()).toMatchObject({ phase: 'error', message: 'Workbook failed' });
    expect(f.download).not.toHaveBeenCalled();
    await f.output.generate('xlsx'); expect(f.download).toHaveBeenCalledOnce();
  });
});
