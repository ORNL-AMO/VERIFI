import { TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { of } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';
import { AccountModelingReportEditor } from '../editing/modeling-report-editor.service';
import { AccountModelingReportService } from '../modeling-report.service';
import { accountModelingSnapshot, addSecondModelingFacility, modelingBase } from '../testing/modeling-report-test-fixtures';

describe('account Modeling workflow in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); await page.viewport(1280, 720); });
  it.each(['energy', 'water'] as const)('prepares baseline and partial %s years with native Workers and keeps diagnostics exportable', async category => {
    const snapshot = accountModelingSnapshot(category);
    snapshot.meterData = snapshot.meterData.filter(row => row.year !== 2024 || row.month <= 3);
    Object.assign(snapshot.facilityAnalyses[0].groups[0], { isGeneratedModel: true, selectedModelId: undefined });
    if (category === 'energy') addSecondModelingFacility(snapshot);
    const base = modelingBase(snapshot), delivered: ReportArtifact[] = [];
    const workerUrl = new URL('../../../../../platform/web-workers/analysis-report.worker', import.meta.url);
    const execute = vi.fn((request: AnalysisReportWorkerRequest) => runWorker<AnalysisReportWorkerResponse>(new Worker(workerUrl, { type: 'module' }), request));
    const view = await setupAccountReportWorkbench(snapshot, [
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of(base), currentInputFingerprint: () => 'current',
        project: (_base, request) => projectWorkspaceCalendarization(base, snapshot, request), retry: vi.fn() } },
      { provide: AnalysisReportCalculationService, useValue: { execute } },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ]);
    const workbench = await view.open('report'); view.harness.fixture.autoDetectChanges();
    const session = workbench.workbench.session()!, editor = session.injector.get(AccountModelingReportEditor);
    const results = session.injector.get(AccountModelingReportService);
    expect(editor.periods()).toEqual([2022, 2023, 2024]); expect(execute).not.toHaveBeenCalled();
    expect(workbench.workbench.stages().map(stage => stage.id)).toEqual(['setup', 'report']);
    expect(workbench.context.typeLabel()).toBe('Modeling'); expect(workbench.context.resources()[0].icon).toBe('modelingReport');
    expect(view.updateSetup).not.toHaveBeenCalled();
    const root = view.harness.fixture.nativeElement as HTMLElement;
    root.className = 'v1-root v1-palette-blueprint';
    for (const [width, dark] of [[1280, false], [760, true], [390, true]] as const) {
      await page.viewport(width, 900); root.classList.toggle('v1-theme-dark', dark); root.classList.toggle('v1-contrast-strong', width === 390);
      view.harness.detectChanges();
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      const year = root.querySelector<HTMLSelectElement>('#account-modeling-report-year')!;
      expect(year.labels?.length).toBeGreaterThan(0); year.focus(); expect(document.activeElement).toBe(year);
    }
    editor.form.controls.settings.controls.reportYear.setValue(2022);
    await view.open('report', 'report');
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(execute.mock.calls[0][0].years).toEqual([2022]);
    expect(root.textContent).toContain('Select an available regression model');
    expect(root.querySelector('app-analysis-checks-acknowledgment')).toBeNull();
    expect(session.injector.get(ReportPresentationController).available()).toBe(true);
    expect(view.store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('footer app-report-output-actions button'));
    expect(buttons.map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint', 'Excel']);
    for (const [index, button] of buttons.entries()) { expect(button.disabled).toBe(false); button.click(); await vi.waitFor(() => expect(delivered).toHaveLength(index + 1)); }
    expect(await delivered[0].blob.slice(0, 5).text()).toBe('%PDF-'); expect(delivered[1].fileName).toContain('.pptx'); expect(delivered[2].fileName).toContain('_Executive_Summary_VERIFI.xlsx');
    expect(delivered.every(artifact => artifact.fileName.includes('Portfolio'))).toBe(true);
    await view.open('report'); expect(workbench.workbench.session()).toBe(session);
    editor.form.controls.settings.patchValue({ reportYear: 2024, includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false });
    await view.open('report', 'report');
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(execute.mock.calls.at(-1)![0]).toMatchObject({ operation: 'modeling', includeModelDetails: false, chartMeters: [] });
    expect(session.injector.get(ReportPresentationController).available()).toBe(false);
    expect(root.textContent).toContain('No sections are selected.');
    expect(root.querySelectorAll('footer app-report-output-actions button:disabled')).toHaveLength(3);
  }, 60000);
});
