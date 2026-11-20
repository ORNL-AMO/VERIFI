import { TestBed } from '@angular/core/testing';
import { getModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { buildModelingReport } from '@domain/reports/modeling-report';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReportFixture, regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ModelingReportContentModule } from './modeling-report.module';
import { ModelingReportComponent } from './modeling-report.component';
import { modelingExportFixture } from './testing/modeling-report-export-fixture';

describe('Modeling report content', () => {
  it('renders an earlier cutoff without extra text and retains the other details when no complete year exists', async () => {
    const { fixture, root } = await render(true), view = modelingExportFixture().view;
    fixture.componentRef.setInput('view', { ...view, reportYear: 2024 }); fixture.detectChanges();
    expect(root.querySelector('app-analysis-model-comparison-chart')).not.toBeNull();
    expect(root.textContent).not.toContain('Chart through');
    const next = structuredClone(view);
    Object.assign(next.regression[0], { chart: { ...next.regression[0].chart, monthly: [], throughYear: undefined,
      message: 'No complete reporting year is available for this group between 2022 and 2023.' } });
    fixture.componentRef.setInput('view', next); fixture.detectChanges();
    expect(root.querySelector('app-analysis-model-comparison-chart')).toBeNull();
    expect(root.textContent).toContain('No complete reporting year');
    expect(root.querySelectorAll('.model-validation > .table-scroll table')).toHaveLength(2);
  });
  afterEach(() => TestBed.resetTestingModule());
  async function render(regression = false) {
    await TestBed.configureTestingModule({ imports: [ModelingReportContentModule] }).compileComponents();
    const snapshot = regression ? regressionAnalysisReportFixture() : analysisReportFixture();
    const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis'), 2023);
    const fixture = TestBed.createComponent(ModelingReportComponent);
    const view = buildModelingReport(checks, getModelingReportSettings(), { facilities: {}, groups: { group: 'Main meters' } }, 'facility');
    fixture.componentRef.setInput('title', 'Plant modeling'); fixture.componentRef.setInput('view', view); fixture.detectChanges();
    return { fixture, view, root: fixture.nativeElement as HTMLElement };
  }
  it('renders user-defined formulas and predictor validation without fabricated model statistics', async () => {
    const { root } = await render(true);
    expect(root.textContent).toContain('User defined'); expect(root.textContent).toContain('Predictor 0');
    expect(root.querySelectorAll('.model-validation table')).toHaveLength(2);
    expect(root.querySelectorAll('.table-scroll[tabindex="0"] table').length).toBeGreaterThan(1);
    expect(root.textContent).toContain('Mean Report Year Value'); expect(root.textContent).toContain('Validation check');
    const details = root.querySelector('.model-validation')!;
    expect(details.querySelector('h4')?.textContent).toBe('Main meters');
    expect(Array.from(details.querySelectorAll('thead th')).map(cell => cell.textContent)).not.toContain('Facility');
    expect(Array.from(details.querySelectorAll('thead th')).map(cell => cell.textContent)).not.toContain('Group');
    expect(details.querySelector('tbody td')?.textContent).toContain('User defined');
    expect(details.querySelector('app-model-equation')).not.toBeNull();
    expect(Array.from(details.querySelectorAll('thead th')).some(cell => cell.textContent === 'Formula')).toBe(false);
    expect(root.querySelector('#modeling-executive')!.parentElement!.textContent).toContain('Formula');
  });
  it('retains qualified headings and identity columns for account-scoped content', async () => {
    const { fixture, view, root } = await render(true);
    fixture.componentRef.setInput('view', { ...view, scope: 'account' }); fixture.detectChanges();
    const details = root.querySelector('.model-validation')!;
    expect(details.querySelector('h4')?.textContent).toBe('Plant A · Main meters');
    expect(Array.from(details.querySelectorAll('thead th')).map(cell => cell.textContent)).toContain('Facility');
    expect(Array.from(details.querySelectorAll('thead th')).map(cell => cell.textContent)).toContain('Group');
  });
  it('separates the three selected sections into document portions with one report title', async () => {
    const { root } = await render(true);
    const portions = Array.from(root.querySelectorAll('article.report-document'));
    expect(portions.map(portion => portion.querySelector('h3')?.textContent)).toEqual([
      'Issues Summary', 'Executive Summary', 'Model Details'
    ]);
    expect(portions.map(portion => portion.getAttribute('aria-labelledby'))).toEqual([
      'modeling-issues', 'modeling-executive', 'modeling-validation'
    ]);
    expect(root.querySelectorAll('.document-title')).toHaveLength(1);
    expect(Array.from(root.querySelectorAll('.document-title p')).map(line => line.textContent?.trim())).toEqual(['Generated By VERIFI']);
  });
  it('presents clean and unavailable results as notices with an icon and a bold heading', async () => {
    const { root } = await render();
    const clean = root.querySelector('.report-notice.v1-alert--success')!;
    expect(clean.getAttribute('role')).toBe('status');
    expect(clean.querySelector('.report-notice__heading app-ui-icon')).not.toBeNull();
    expect(clean.querySelector('strong')?.textContent).toBe('No issues identified.');
    const unavailable = root.querySelector('#modeling-validation')!.parentElement!.querySelector('.report-notice')!;
    expect(unavailable.classList.contains('v1-alert--info')).toBe(true);
    expect(unavailable.querySelector('strong')?.textContent).toBe('No regression groups are included.');
    expect(unavailable.querySelector('p')?.textContent).toBe('Model Details apply to regression groups.');
  });
  it('renders missing models as diagnostics and preserves zero-valued generated statistics', async () => {
    const { fixture, view, root } = await render(true);
    const model = { ...view.regression[0].model!, isUserDefinedModel: false, R2: 0, adjust_R2: 0, modelPValue: 0 };
    const groups = [{ ...view.groups[0], model }];
    fixture.componentRef.setInput('view', buildModelingReport({ reportYear: 2023, groups, hasBlockingErrors: true }, view.settings, { facilities: {}, groups: {} }, 'facility'));
    fixture.detectChanges(); expect(root.textContent).toContain('0.000'); expect(root.textContent).toContain('0.00');
    fixture.componentRef.setInput('view', buildModelingReport({ reportYear: 2023, groups: [{ ...groups[0], model: undefined, critical: ['Select a model.'] }], hasBlockingErrors: true }, view.settings, { facilities: {}, groups: {} }, 'facility'));
    fixture.detectChanges(); expect(root.textContent).toContain('Select a model.'); expect(root.textContent).toContain('Model unavailable');
    expect(root.querySelector('.model-validation tbody td')?.textContent).toContain('Model unavailable');
  });
  it('honors each section switch and explains no regression groups or no selected content', async () => {
    const { fixture, view, root } = await render();
    expect(root.textContent).toContain('Absolute Consumption'); expect(root.textContent).toContain('No regression groups');
    for (const key of ['includeIssuesSummary', 'includeExecutiveSummary', 'includeDataValidationTables'] as const) {
      const settings = { includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false, [key]: true };
      fixture.componentRef.setInput('view', { ...view, settings }); fixture.detectChanges();
      expect(root.querySelectorAll('article.report-document')).toHaveLength(1);
      expect(root.querySelectorAll('.document-title')).toHaveLength(1);
      expect(root.querySelectorAll('article > section')).toHaveLength(1);
    }
    fixture.componentRef.setInput('view', { ...view, hasContent: false, settings: { includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false } });
    fixture.detectChanges(); expect(root.textContent).toContain('No sections are selected'); expect(root.querySelector('table')).toBeNull();
  });
});
