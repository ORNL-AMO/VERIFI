import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ReportsModule } from '../reports.module';
import { AnalysisDataChecksComponent } from './analysis-data-checks.component';

describe('analysis check presentation', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['absoluteEnergyConsumption', 'energyIntensity', 'modifiedEnergyIntensity', 'regression'] as const)('shows %s checks and links to the owning group', async method => {
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'); inputs.facilityAnalyses[0].groups[0].analysisType = method;
    const fixture = TestBed.createComponent(AnalysisDataChecksComponent);
    fixture.componentRef.setInput('checks', [calculateAnalysisDataChecks(inputs, 2023)]);
    fixture.componentRef.setInput('groupNames', { group: 'Furnaces' }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Furnaces');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toContain('/facility/facility/analysis/workbench/facility-analysis/group/group/');
    expect(!!fixture.nativeElement.querySelector('.issue-card--danger .issue-link')).toBe(method === 'regression');
    expect(fixture.nativeElement.querySelectorAll('.issue-card').length).toBe(method === 'regression' ? 1 : 0);
  });
  it('aggregates periods once and opens the exact affected group from an issue', async () => {
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    const clean = calculateAnalysisDataChecks(inputs, 2024), warning = calculateAnalysisDataChecks(inputs, 2023);
    Object.assign(clean.groups[0], { minor: ['Review the production predictor.'] });
    Object.assign(warning.groups[0].group, { analysisType: 'regression' });
    Object.assign(warning.groups[0], { moderate: ['Predictor values are outside the model range.'], model: {
      isValid: true, SEPValidationPass: false, isUserDefinedModel: true, coef: [10, 2], predictorVariables: [{ name: 'Production' }],
      SEPValidation: [{ predictorVariable: 'Production', meanReportYear: 500, meanBaselineYear: 100, modelMin: 20, modelMinValid: false,
        modelMax: 200, modelMaxValid: true, isValid: false }]
    } });
    const fixture = TestBed.createComponent(AnalysisDataChecksComponent);
    fixture.componentRef.setInput('checks', [clean, warning]); fixture.componentRef.setInput('groupNames', { group: 'Furnaces' }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect([...root.querySelectorAll('h2')].map(item => item.textContent)).toEqual(['Issues summary', 'Executive summary']);
    expect(root.querySelector('h4')).toBeNull();
    expect(root.querySelector('[aria-labelledby="analysis-executive-title"] .check-facts')).toBeNull();
    expect(root.textContent).not.toContain('Compare analysis groups below.');
    expect(root.querySelectorAll('.issue-card')).toHaveLength(1);
    expect(root.querySelector('.issue-card--warning .issue-card-count')!.textContent).toBe('2');
    expect(root.querySelector('.issue-card')!.textContent).toContain('Plant A');
    expect(root.querySelector('.issue-card-title')!.textContent).toContain('Furnaces');
    expect(root.querySelector('.issue-total--warning dd')!.textContent).toBe('1');
    expect(root.querySelector('.issue-total--info dd')!.textContent).toBe('1');
    expect(root.querySelectorAll('.executive-summary-row')).toHaveLength(2);
    expect(root.querySelectorAll('.validation-detail')).toHaveLength(0);
    [...root.querySelectorAll<HTMLButtonElement>('.issue-link')].find(button => button.textContent!.includes('2023'))!.click(); fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('.validation-detail')!;
    expect(panel.getAttribute('aria-label')).toContain('2023');
    expect(panel.querySelector('a')).toBeNull();
    expect(panel.textContent).not.toContain('critical ·');
    expect(document.activeElement).toBe(panel);
    expect(panel.textContent).toContain('Data validation'); expect(panel.querySelector('.check-failed')!.textContent).toContain('Fail');
    panel.querySelector<HTMLButtonElement>('button')!.click(); fixture.detectChanges();
    expect(root.querySelector('.validation-detail')).toBeNull();
    expect((document.activeElement as HTMLElement).dataset['checkKey']).toContain('2023');
  });

  it('separates facilities sharing a group ID, hides clean groups, and uses the highest issue severity', async () => {
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    const group = check.groups[0];
    const fixture = TestBed.createComponent(AnalysisDataChecksComponent);
    fixture.componentRef.setInput('checks', [{ ...check, groups: [
      { ...group, critical: ['Missing model.'], minor: ['Review predictor selection.'] },
      { ...group, facilityGuid: 'second', facilityName: 'Plant B', moderate: ['Values outside model range.'] },
      { ...group, facilityGuid: 'third', facilityName: 'Plant C', minor: ['Review the model intercept.'] },
      { ...group, facilityGuid: 'fourth', facilityName: 'Clean plant' }
    ] }]);
    fixture.componentRef.setInput('groupNames', { group: 'Furnaces' }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, cards = [...root.querySelectorAll('.issue-card')];
    expect(cards).toHaveLength(3);
    expect(cards[0].classList.contains('issue-card--danger')).toBe(true);
    expect(cards[0].textContent).toContain('Critical:'); expect(cards[0].textContent).toContain('Minor:');
    expect(cards[1].textContent).toContain('Plant B'); expect(cards[1].classList.contains('issue-card--warning')).toBe(true);
    expect(cards[2].textContent).toContain('Plant C'); expect(cards[2].classList.contains('issue-card--info')).toBe(true);
    expect(cards.some(card => card.textContent!.includes('Clean plant'))).toBe(false);
    expect(root.querySelector('.issue-total--danger dd')!.textContent).toBe('1');
    expect(root.querySelector('.issue-total--warning dd')!.textContent).toBe('1');
    expect(root.querySelector('.issue-total--info dd')!.textContent).toBe('2');
    expect(root.querySelectorAll('.executive-summary-row')).toHaveLength(4);
  });

  it('shows regression model comparisons at a glance and keeps user-defined and missing models explicit', async () => {
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    const group = check.groups[0];
    const regressionGroup = { ...group.group, analysisType: 'regression', regressionModelYear: 2024 };
    const model = { isValid: true, isUserDefinedModel: false, SEPValidationPass: true, coef: [1700, 1.51],
      R2: .964, adjust_R2: .956, modelPValue: .001, t: { p: [.01, .001] }, predictorVariables: [{ name: 'Production' }] };
    const fixture = TestBed.createComponent(AnalysisDataChecksComponent);
    fixture.componentRef.setInput('checks', [{ ...check, groups: [
      { ...group, group: regressionGroup, model, minor: ['Intercept is negative.'] },
      { ...group, facilityGuid: 'second', facilityName: 'Plant B', group: regressionGroup, model: { ...model, isUserDefinedModel: true } },
      { ...group, facilityGuid: 'third', facilityName: 'Plant C', group: regressionGroup }
    ] }]); fixture.componentRef.setInput('groupNames', { group: 'Electricity' }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, table = root.querySelector('.executive-summary-table')!;
    expect(table.querySelector('caption')!.textContent).toContain('2023 — Analysis type: Regression');
    expect([...table.querySelectorAll('thead th')].map(item => item.textContent!.trim())).toEqual([
      'Facility', 'Group', 'Model year', 'Variable p-values', 'R²', 'Adjusted R²', 'Model p-value', 'Formula', 'Minor issues'
    ]);
    const rows = [...table.querySelectorAll('.executive-summary-row')]; expect(rows).toHaveLength(3);
    for (const text of ['Plant A', 'Electricity', '2024', 'Production: 0.00', '0.964', '0.956', '0.00', '1,700', '1.51', 'Intercept is negative.']) expect(rows[0].textContent).toContain(text);
    expect(rows[1].textContent).toContain('User defined');
    expect([...rows[1].querySelectorAll('.summary-number')].every(cell => cell.textContent!.trim() === '—')).toBe(true);
    expect(rows[2].querySelector('.summary-formula')!.textContent!.trim()).toBe('—');
    expect(root.querySelector('.validation-detail')).toBeNull();
    rows[0].querySelector<HTMLButtonElement>('.validation-toggle')!.click(); fixture.detectChanges();
    expect(root.querySelector('.validation-detail')!.textContent).toContain('Predictor validation is unavailable');
    expect(root.querySelectorAll('.executive-summary-row')).toHaveLength(3);
  });

});
