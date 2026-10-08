import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisBankingResultsService } from './facility-analysis-banking-results.service';
import { FacilityAnalysisBankingComponent } from './facility-analysis-banking.component';

describe('FacilityAnalysisBankingComponent', () => {
  it('links the source, reviews its model, and renders transition results with the four required charts', () => {
    const source = {
      guid: 'source-analysis', name: 'Verified 2022 analysis', analysisCategory: 'energy',
      energyUnit: 'MMBtu', waterUnit: 'gal'
    } as IdbAnalysisItem;
    const sourceGroup = {
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true,
      regressionModelYear: 2022, regressionConstant: 8, selectedModelId: 'model-a',
      predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 }],
      models: [{
        modelId: 'model-a', isValid: false, R2: .9, adjust_R2: .88, modelPValue: .01,
        modelYear: 2022, coef: [8, 2], predictorVariables: [{ id: 'production', name: 'Production' }],
        SEPValidationPass: true, SEPValidation: [], modelNotes: ['Review extrapolation'], dataValidationNotes: [], modelValidationNotes: []
      }]
    } as unknown as AnalysisGroup;
    const configuredGroup = {
      idbGroupId: 'group-a', applyBanking: true, bankedAnalysisYear: 2023, newBaselineYear: 2025
    } as AnalysisGroup;
    const annual = [
      {
        year: 2023, energyUse: 100, adjusted: 110, totalSavingsPercentImprovement: 9,
        annualSavingsPercentImprovement: 4, cummulativeSavings: 10, isBanked: true, savingsBanked: 10
      },
      {
        year: 2024, energyUse: 95, adjusted: 110, totalSavingsPercentImprovement: 9,
        annualSavingsPercentImprovement: 0, cummulativeSavings: 10, isBanked: true,
        isIntermediateBanked: true, savingsBanked: 0
      }
    ] as AnnualAnalysisSummary[];
    const monthly = [
      {
        date: new Date(2023, 0, 1), fiscalYear: 2023, energyUse: 8, adjusted: 9,
        rolling12MonthImprovement: 4, percentSavingsComparedToBaseline: 4, isBanked: true
      },
      {
        date: new Date(2024, 0, 1), fiscalYear: 2024, energyUse: 7, adjusted: 9,
        rolling12MonthImprovement: 4, percentSavingsComparedToBaseline: 4, isBanked: true,
        isIntermediateBanked: true
      }
    ] as MonthlyAnalysisSummaryData[];

    TestBed.configureTestingModule({
      imports: [FacilityAnalysisBankingComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisGroupContext,
          useValue: {
            group: signal(configuredGroup),
            meterGroup: signal({ name: 'Electricity' }),
            workbench: { facility: signal({ guid: 'facility-a' }) }
          }
        },
        {
          provide: FacilityAnalysisBankingResultsService,
          useValue: {
            state: signal({ state: 'ready', annual, monthly }),
            sourceAnalysis: signal(source), sourceGroup: signal(sourceGroup), hasBlockingErrors: signal(false)
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            facilityAnalysisWorkbenchRoute: (facilityGuid: string, analysisGuid: string) => [
              '/analysis', facilityGuid, analysisGuid
            ]
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisBankingComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Verified 2022 analysis');
    expect(text).not.toContain('Source group');
    expect(text).toContain('Applied through2023');
    expect(text).toContain('New baseline2025');
    expect(text).not.toContain('Source annual results');
    expect(text).not.toContain('Monthly results table');
    expect(text).toContain('Transition period');
    const summary = fixture.nativeElement.querySelector('.v1-banking-results__summary') as HTMLElement;
    expect(summary.querySelector('.v1-banking-results__source-link')).not.toBeNull();
    expect(summary.querySelector('dl')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-banking-results__equation').textContent.replace(/\s+/g, ' ').trim())
      .toBe('Modeled Energy=8 + (2 × Production)');
    expect(Array.from(fixture.nativeElement.querySelectorAll('.v1-banking-results__table tbody th'))
      .map((cell: Element) => cell.textContent?.trim()))
      .toEqual(['2023', '2024']);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.v1-banking-results__table tbody tr'))
      .map((row: Element) => Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim())))
      .toEqual([
        ['2023', '100', '110', '9%', '4%', '10'],
        ['2024', '95', '—', '9%', '—', '10']
      ]);

    const sourceLink = fixture.nativeElement.querySelector('.v1-banking-results__source-link') as HTMLAnchorElement;
    expect(sourceLink.getAttribute('href')).toBe('/analysis/facility-a/source-analysis');
    expect(fixture.debugElement.query(By.css('.v1-banking-results__source-link')).query(By.directive(IconComponent)).componentInstance.name)
      .toBe('link');

    const inspectButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: Element) => button.textContent?.includes('Inspect model')) as HTMLButtonElement;
    inspectButton.click();
    fixture.detectChanges();
    const reviewText = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(reviewText).toContain('Review regression model');
    expect(reviewText).toContain('Modeled Energy');
    expect(reviewText).toContain('Variables and coefficients');
    expect(reviewText).toContain('Review extrapolation');

    const charts = fixture.debugElement.queryAll(By.directive(MeterResultsChartComponent))
      .map(element => element.componentInstance as MeterResultsChartComponent);
    expect(charts.map(chart => chart.ariaLabel)).toEqual([
      'Banking annual actual and calculated use chart',
      'Banking annual and total improvement chart',
      'Banking monthly actual and calculated use chart',
      'Banking monthly rolling savings chart'
    ]);
    expect(charts.map(chart => chart.chartRows.length)).toEqual([2, 2, 2, 2]);
    expect(charts[1].chartRows[1]).toMatchObject({
      periodLabel: '2024',
      values: { annualImprovement: null, totalImprovement: 9 }
    });
    expect(charts[0].chartRows[1]).toMatchObject({ values: { calculated: null } });
    expect(charts[2].chartRows[1]).toMatchObject({ values: { calculated: null } });
    expect(charts[3].chartRows[1]).toMatchObject({
      values: { bankedSavings: 4, bankedLosses: 0, savings: 0, losses: 0 }
    });
  });
});
