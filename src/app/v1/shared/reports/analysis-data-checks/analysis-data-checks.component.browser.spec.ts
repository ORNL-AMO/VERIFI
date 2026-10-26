import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { JStatRegressionModel } from '@data/models/analysis';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ReportsModule } from '../reports.module';
import { AnalysisDataChecksComponent } from './analysis-data-checks.component';

describe('shared analysis validation disclosures in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); await page.viewport(1200, 900); });
  it('supports keyboard drill-in, themed tables, and localized overflow at narrow widths', async () => {
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    const model: JStatRegressionModel = {
      coef: [10, 2], R2: .964, adjust_R2: .956, t: { p: [.01, .003] }, f: {}, modelYear: 2022, modelId: 'model', isValid: true, modelPValue: 0,
      isUserDefinedModel: false, predictorVariables: [{ name: 'Production volume' } as JStatRegressionModel['predictorVariables'][number]], modelNotes: [], dataValidationNotes: [], modelValidationNotes: [], SEPValidationPass: false,
      SEPValidation: [{ predictorVariable: 'Production volume with a long descriptive label', meanReportYear: 500, meanBaselineYear: 100,
        modelMin: 20, modelMinValid: false, modelMax: 200, modelMaxValid: true, modelMinus3StdDev: 0, modelMinus3StdDevValid: true,
        modelPlus3StdDev: 300, modelPlus3StdDevValid: false, isValid: false }]
    };
    Object.assign(check.groups[0].group, { analysisType: 'regression', regressionModelYear: 2022, regressionModelStartMonth: 0, regressionStartYear: 2022, regressionModelEndMonth: 11, regressionEndYear: 2022 });
    Object.assign(check.groups[0], { model, moderate: ['Predictor values exceed the model range.'] });
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisDataChecksComponent);
    fixture.componentRef.setInput('checks', [{ ...check, groups: [check.groups[0],
      { ...check.groups[0], facilityGuid: 'second', facilityName: 'Plant B', moderate: [], critical: ['Model needs correction.'] },
      { ...check.groups[0], facilityGuid: 'third', facilityName: 'Plant C', model: undefined, moderate: [], minor: ['Review predictor selection.'] }
    ] }]); fixture.componentRef.setInput('groupNames', { group: 'Furnaces with a long descriptive name' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.style.maxWidth = '100%'; root.className = 'v1-root v1-palette-blueprint';
    const rowButton = root.querySelector<HTMLButtonElement>('.validation-toggle')!;
    expect(root.querySelector('.validation-detail')).toBeNull();
    expect(root.querySelectorAll('.executive-summary-row')).toHaveLength(3);
    rowButton.focus(); await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    expect(rowButton.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.validation-detail table')).not.toBeNull();
    await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    expect(root.querySelector('.validation-detail')).toBeNull();
    root.querySelector<HTMLButtonElement>('.issue-link')!.focus(); await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('.validation-detail')!;
    expect(document.activeElement).toBe(panel); expect(panel.textContent).toContain('Fail');
    for (const dark of [false, true]) {
      root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 900); fixture.detectChanges();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        const cards = [...root.querySelectorAll<HTMLElement>('.issue-card')];
        expect(cards).toHaveLength(3);
        if (width === 1024) expect(cards[0].getBoundingClientRect().top).toBe(cards[1].getBoundingClientRect().top);
        else expect(cards[1].getBoundingClientRect().top).toBeGreaterThan(cards[0].getBoundingClientRect().bottom);
        expect(getComputedStyle(cards[0]).borderTopColor).not.toBe(getComputedStyle(cards[1]).borderTopColor);
        const tableRegion = root.querySelector<HTMLElement>('.executive-summary-scroll')!;
        expect(tableRegion.getBoundingClientRect().width).toBeLessThanOrEqual(root.clientWidth);
        expect(root.querySelector<HTMLElement>('.validation-detail')!.getBoundingClientRect().width).toBeLessThanOrEqual(tableRegion.clientWidth);
        const heading = getComputedStyle(root.querySelector('h2')!);
        expect(parseFloat(heading.borderBottomWidth)).toBe(0);
        expect(heading.letterSpacing).toBe('normal'); expect(root.querySelector('h4')).toBeNull();
      }
      root.querySelector<HTMLButtonElement>('.validation-detail button')!.click(); fixture.detectChanges();
      const executiveSection = root.querySelector<HTMLElement>('[aria-labelledby="analysis-executive-title"]')!;
      executiveSection.scrollIntoView({ block: 'start' });
      await page.screenshot({ element: executiveSection, path: `./__screenshots__/analysis-executive-narrow-${dark ? 'dark' : 'light'}.png` });
      await page.viewport(1500, 900); fixture.detectChanges();
      await page.screenshot({ element: executiveSection, path: `./__screenshots__/analysis-executive-wide-${dark ? 'dark' : 'light'}.png` });
      rowButton.click(); fixture.detectChanges();

    }
  });
});
