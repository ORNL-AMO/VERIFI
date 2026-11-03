import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as ExcelJS from 'exceljs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { BetterPlantsAssets, BETTER_PLANTS_TEMPLATES } from '@platform/reports/better-plants-assets.service';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { ReportResultState } from '@app/v1/reports/shared/calculation/report-result-state';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { BetterPlantsReportService, BetterPlantsResult } from '../better-plants-report.service';
import { BetterPlantsEditor } from '../editing/better-plants-editor.service';
import { BetterPlantsOutputService } from './better-plants-output.service';

function bytes(path: string): ArrayBuffer { return Uint8Array.from(readFileSync(join(process.cwd(), 'src/assets', path))).buffer; }
function image(path: string, mime: string): string { return `data:${mime};base64,${readFileSync(join(process.cwd(), 'src/assets/images', path)).toString('base64')}`; }
async function artifactBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob);
  });
}

function setup(category: 'energy' | 'water' = 'energy') {
  // The saved report baseline can be stale; v1 exports use the linked analysis's baseline.
  const initial = analysisReportFixture(category);
  const snapshot = { ...initial, accountReports: [{ ...initial.accountReports[0], baselineYear: 1999 }] };
  const workspace = new AccountWorkspaceStore(); workspace.publish(snapshot);
  const inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
  const result = signal<ReportResultState<BetterPlantsResult>>({ state: 'ready', key: 'current-result', value: {
    inputs, summaries: calculateBetterPlantsReport(inputs, [2023]), years: [2023], fingerprints: ['current'], completed: true, reviewed: true, blocked: false
  } });
  const stage = signal('report'), flush = vi.fn(async () => true), download = vi.fn<(artifact: ReportArtifact) => void>();
  const assets = { template: vi.fn(async () => bytes(`csv_templates/${BETTER_PLANTS_TEMPLATES[category]}.xlsx`)),
    images: vi.fn(async () => ({ banner: image('better-plants-report-banner.jpg', 'image/jpeg'), footer: image('better-plants-report-footer.png', 'image/png') })) };
  TestBed.configureTestingModule({ providers: [BetterPlantsOutputService,
    { provide: AccountReportWorkbenchContext, useValue: { workspace, stage, key: () => 'account:report', report: computed(() => workspace.accountReports()[0]) } },
    { provide: BetterPlantsReportService, useValue: { state: result } }, { provide: BetterPlantsEditor, useValue: { flush } },
    { provide: BetterPlantsAssets, useValue: assets }, { provide: ReportFileDeliveryService, useValue: { download } }
  ] });
  return { snapshot, workspace, result, stage, flush, assets, download, service: TestBed.inject(BetterPlantsOutputService) };
}

describe('Better Plants output capability', () => {
  afterEach(() => TestBed.resetTestingModule());

  it.each(['energy', 'water'] as const)('produces the real %s workbook using the linked baseline and existing template', async category => {
    const { service, download, flush, result } = setup(category);
    expect(service.output.formats).toEqual(['pdf', 'xlsx']);
    await service.output.generate('xlsx');
    expect(flush).toHaveBeenCalledOnce(); expect(download).toHaveBeenCalledOnce();
    const artifact = download.mock.calls[0][0], workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await artifactBytes(artifact.blob));
    const sheet = workbook.getWorksheet(`${category === 'energy' ? 'Annual Form' : 'Baseline Form'} (2023)`)!;
    expect(artifact.fileName).toMatch(/\.xlsx$/);
    expect(sheet.getCell(category === 'energy' ? 'D10' : 'E16').value).toBe(result().value!.inputs.analysis.baselineYear);
  });

  it.each(['energy', 'water'] as const)('builds a direct portrait %s PDF from the same prepared form', async category => {
    const { service, download } = setup(category);
    await service.output.generate('pdf');
    expect(download).toHaveBeenCalledOnce();
    const artifact = download.mock.calls[0][0], content = new TextDecoder('latin1').decode(await artifactBytes(artifact.blob));
    expect(artifact.mimeType).toBe('application/pdf'); expect(artifact.fileName).toMatch(/\.pdf$/);
    expect(content.startsWith('%PDF-')).toBe(true);
    expect(content).toMatch(/\/MediaBox \[0 0 612(?:\.0*)? 792(?:\.0*)?\]/);
    expect((content.match(/\/Subtype \/Image/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(service.output.state().message).toContain('Download started');
  });

  it('keeps the content key stable for unrelated account settings and refreshes contact metadata', () => {
    const { service, workspace, snapshot } = setup();
    const before = service.source(); if (before.state !== 'ready') throw new Error('Expected ready output');
    workspace.publish({ ...snapshot, account: { ...snapshot.account, lastBackup: new Date('2026-01-01') } });
    const unrelated = service.source(); expect(unrelated.state === 'ready' && unrelated.key).toBe(before.key);
    workspace.publish({ ...snapshot, account: { ...snapshot.account, contactName: 'Updated contact' } });
    const changed = service.source(); expect(changed.state === 'ready' && changed.key).not.toBe(before.key);
  });

  it('ignores unused embedded facility metadata in cached summaries', () => {
    const { service, result } = setup();
    const before = service.source(); if (before.state !== 'ready') throw new Error('Expected ready output');
    const current = result(), summaries = structuredClone(current.value!.summaries!);
    for (const summary of summaries) for (const entry of summary.facilityPerformance) entry.facility.name = 'Unused cached name';
    result.set({ ...current, value: { ...current.value!, summaries } });
    const after = service.source(); expect(after.state === 'ready' && after.key).toBe(before.key);
  });

  it('does not load assets for unsupported, incomplete or non-Report requests', async () => {
    const { service, result, stage, assets, download } = setup();
    await service.output.generate('pptx');
    result.set({ key: 'review', state: 'review-required', message: 'Review current checks.' });
    await service.output.generate('pdf'); expect(service.output.available()).toBe(false);
    stage.set('setup'); await service.output.generate('xlsx');
    expect(assets.template).not.toHaveBeenCalled(); expect(assets.images).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });

  it('surfaces asset errors without downloading a partial form', async () => {
    const { service, assets, download } = setup();
    assets.images.mockRejectedValueOnce(new Error('Form artwork unavailable. Reload and try again.'));
    await service.output.generate('pdf');
    expect(service.output.state()).toMatchObject({ phase: 'error', message: 'Form artwork unavailable. Reload and try again.' });
    expect(download).not.toHaveBeenCalled();
  });
});
