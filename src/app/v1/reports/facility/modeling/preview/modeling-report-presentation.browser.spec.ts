import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { page, userEvent } from 'vitest/browser';
import { of } from 'rxjs';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { calculateModelingReport } from '@domain/reports/modeling-report-calculation';
import { echarts } from '@app/v1/shared/charts/echarts';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { modelingMeters, modelingSnapshot } from '../testing/modeling-report-test-fixtures';
import { FacilityModelingReportService } from '../modeling-report.service';

@Component({ standalone: true, imports: [PortalModule], host: { style: 'display:contents' },
  template: `<div class="v1-root v1-palette-blueprint" [class.v1-theme-dark]="dark()" [class.v1-contrast-strong]="dark()" style="display:contents">
    <ng-container [cdkPortalOutlet]="modal.activePortal()"/>
  </div>` })
class ModelingPresentationPortalHost {
  readonly modal = inject(ModalPortalService);
  readonly dark = signal(false);
}

async function setup(snapshot = modelingSnapshot()) {
  const meters = modelingMeters(snapshot);
  const execute = vi.fn((request: AnalysisReportWorkerRequest) => of<AnalysisReportWorkerResponse>(request.operation === 'modeling'
    ? { ok: true, operation: 'modeling', value: request.years.map(year => calculateModelingReport(request.inputs, year, request.chartMeters)) }
    : { ok: true, operation: 'checks', value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }));
  const view = await setupReportWorkbench(snapshot.facilityReports, [
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready', inputFingerprint: 'current', meters }),
      currentInputFingerprint: () => 'current', project: () => ({ state: 'ready', meters }), retry: vi.fn() } },
    { provide: AnalysisReportCalculationService, useValue: { execute } }
  ], snapshot);
  const workbench = await view.open('modeling-report', 'report');
  const root = view.harness.fixture.nativeElement as HTMLElement;
  root.className = 'v1-root v1-palette-blueprint';
  Object.assign(root.style, { display: 'block', height: '600px', overflow: 'auto',
    '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
  Object.assign(root.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
    { display: 'flex', overflow: 'visible', minHeight: '100%' });
  const session = workbench.workbench.session()!, results = session.injector.get(FacilityModelingReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
  await view.harness.fixture.whenStable();
  const mount = root.parentElement!, portal = TestBed.createComponent(ModelingPresentationPortalHost);
  portal.autoDetectChanges(); mount.appendChild(root); root.appendChild(portal.nativeElement); await portal.whenStable();
  return { ...view, root, portal, workbench, session, results, execute };
}

describe('Modeling report presentation in Chromium', () => {
  afterEach(async () => {
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    if (document.fullscreenElement) await document.exitFullscreen();
    await page.viewport(1280, 720);
  });

  it.each(['fullscreen', 'window'] as const)('presents current selected content in %s mode and restores the document without saves or calculations', async mode => {
    await page.viewport(mode === 'window' ? 390 : 1280, 900);
    if (mode === 'window') vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const snapshot = modelingSnapshot();
    snapshot.meterGroups[0].name = 'Manufacturing, production equipment and process heating meters';
    if (mode === 'window') {
      Object.assign(snapshot.facilityReports[0].modelingReportSettings, { includeExecutiveSummary: false, reportYear: 2024 });
      snapshot.meterData = snapshot.meterData.filter(row => row.year < 2024 || row.month <= 3);
      snapshot.predictorData = snapshot.predictorData.filter(row => row.year < 2024 || row.month <= 3);
    }
    const view = await setup(snapshot), { root, portal, session, results } = view;
    portal.componentInstance.dark.set(mode === 'window'); await portal.whenStable();
    const preview = root.querySelector<HTMLElement>('app-modeling-report-preview')!;
    const contents = Array.from(preview.querySelectorAll('article.report-document')).map(paper => paper.textContent);
    const saved = structuredClone(view.store.facilityReports()), analyses = structuredClone(view.store.facilityAnalyses());
    const revision = view.store.committedRevision(), resultBefore = results.state().value;
    const actions = Array.from(root.querySelectorAll<HTMLButtonElement>('footer.v1-wizard-actions button'));
    expect(actions.map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint', 'Present']);
    const present = actions[2]; present.scrollIntoView(); const previousTop = root.scrollTop;
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    const dialog = (portal.nativeElement as HTMLElement).querySelector<HTMLElement>('[role=dialog]')!;
    expect(dialog.getAttribute('aria-label')).toBe('Plant modeling presentation');
    if (mode === 'fullscreen') await vi.waitFor(() => expect(document.fullscreenElement).toBe(dialog));
    else expect(dialog.querySelector('[role=status]')?.textContent).toContain('Fullscreen is unavailable');
    expect(preview.querySelector('app-modeling-report')).toBeNull();
    expect(root.querySelectorAll('app-modeling-report')).toHaveLength(1);
    expect(root.querySelectorAll('#modeling-validation')).toHaveLength(1);
    const papers = Array.from(dialog.querySelectorAll<HTMLElement>('article.report-document'));
    expect(papers.map(paper => paper.textContent)).toEqual(contents);
    expect(dialog.querySelectorAll('.document-title')).toHaveLength(1);
    expect(dialog.querySelector('#modeling-executive') !== null).toBe(mode === 'fullscreen');
    const close = dialog.querySelector<HTMLButtonElement>('[aria-label="Close presentation"]')!;
    expect(document.activeElement).toBe(close);
    const scroll = dialog.querySelector<HTMLElement>('.report-presentation__scroll')!, lockedTop = root.scrollTop;
    const width = papers[0].getBoundingClientRect().width;
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await portal.whenStable();
    expect(papers[0].getBoundingClientRect().width).toBeCloseTo(width * 1.1, 0);
    expect(dialog.querySelector('[aria-label="Reset zoom to 100%"]')?.textContent).toContain('110%');
    await page.getByRole('button', { name: 'Reset zoom to 100%', exact: true }).click(); await portal.whenStable();
    expect(papers[0].getBoundingClientRect().width).toBeCloseTo(width, 0);
    papers.at(-1)!.scrollIntoView(); expect(scroll.scrollTop).toBeGreaterThan(0);
    const chartElement = dialog.querySelector<HTMLElement>('.model-comparison-chart__canvas')!;
    chartElement.scrollIntoView({ block: 'center' });
    await vi.waitFor(() => expect(echarts.getInstanceByDom(chartElement)).toBeDefined());
    const chart = echarts.getInstanceByDom(chartElement)!;
    await vi.waitFor(() => expect(chart.getZr().animation.isFinished()).toBe(true), { timeout: 10_000 });
    expect(dialog.querySelectorAll('app-analysis-model-comparison-chart tbody tr')).toHaveLength(24);
    expect(dialog.textContent).not.toContain('Chart through');
    expect(root.scrollTop).toBe(lockedTop);
    if (mode === 'window') {
      const table = dialog.querySelector<HTMLElement>('.model-validation .table-scroll')!;
      expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth + 1);
      expect(table.querySelectorAll('thead th')).toHaveLength(6);
    }
    expect(close.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroll.getBoundingClientRect().top);
    await page.screenshot({ element: dialog, path: `../../../../../../../.angular/modeling-presentation-${mode}.png` });
    if (mode === 'window') await userEvent.keyboard('{Escape}');
    else await page.getByRole('button', { name: 'Close presentation', exact: true }).click();
    await portal.whenStable(); await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
    expect(preview.querySelectorAll('article.report-document')).toHaveLength(contents.length);
    expect(document.activeElement).toBe(present); expect(root.scrollTop).toBe(previousTop);
    expect(results.state().value).toBe(resultBefore); expect(view.execute).toHaveBeenCalledOnce();
    expect(view.store.facilityReports()).toEqual(saved); expect(view.store.facilityAnalyses()).toEqual(analyses);
    expect(view.store.committedRevision()).toBe(revision);
    expect(view.updateName).not.toHaveBeenCalled(); expect(view.updateSetup).not.toHaveBeenCalled();
    const generate = vi.spyOn(session.runtime.output!, 'generate').mockResolvedValue();
    actions[0].click(); actions[1].click(); expect(generate.mock.calls).toEqual([['pdf'], ['pptx']]);
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    expect((portal.nativeElement as HTMLElement).querySelector('[aria-label="Reset zoom to 100%"]')?.textContent).toContain('100%');
    if (mode === 'fullscreen') {
      await vi.waitFor(() => expect(document.fullscreenElement).not.toBeNull());
      view.store.setPending({ id: 701, label: 'Pending report data' }); view.harness.detectChanges(); await portal.whenStable();
      await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
      expect((portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull();
      expect(session.runtime.presentation!.available()).toBe(false);
      expect(preview.textContent).toContain('Waiting for saved settings');
      view.store.clearPending(701);
    } else {
      await view.open('modeling-report', 'setup'); await portal.whenStable();
      expect((portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull();
      expect(session.runtime.presentation!.available()).toBe(false);
    }
    portal.destroy();
  });

  it('hides Present for excluded content, permits critical model diagnostics, and closes on report deletion', async () => {
    vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const snapshot = modelingSnapshot();
    Object.assign(snapshot.facilityAnalyses[0].groups[0], { isGeneratedModel: true, selectedModelId: undefined });
    Object.assign(snapshot.facilityReports[0].modelingReportSettings,
      { includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false });
    const view = await setup(snapshot);
    expect(view.session.runtime.presentation!.available()).toBe(false);
    expect(view.root.querySelector('footer.v1-wizard-actions')!.textContent).not.toContain('Present');
    expect(view.root.textContent).toContain('No sections are selected.');
    const report = view.store.facilityReports()[0];
    const selected = { ...report,
      modelingReportSettings: { ...report.modelingReportSettings, includeIssuesSummary: true, includeDataValidationTables: true } };
    view.store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [selected] }] });
    await vi.waitFor(() => { view.harness.detectChanges(); expect(view.session.runtime.presentation!.available()).toBe(true); });
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await view.portal.whenStable();
    const dialog = (view.portal.nativeElement as HTMLElement).querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Select an available regression model');
    expect(dialog.textContent).toContain('Model unavailable');
    expect(dialog.querySelector('app-analysis-checks-acknowledgment')).toBeNull();
    view.store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', deleteGuids: [report.guid] }] });
    view.harness.detectChanges(); await view.portal.whenStable();
    expect((view.portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull();
    expect(view.session.injector.destroyed).toBe(true); expect(view.execute).toHaveBeenCalledTimes(2);
    expect(view.updateSetup).not.toHaveBeenCalled();
    view.portal.destroy();
  });
});
