import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { FacilityAnalysisComparisonComponent } from './facility-analysis-comparison.component';

describe('FacilityAnalysisComparisonComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisComparisonComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(FacilityAnalysisComparisonComponent, {
      remove: { imports: [MeterResultsChartComponent] },
      add: { imports: [MeterResultsChartStubComponent] }
    });
    await TestBed.configureTestingModule({ imports: [FacilityAnalysisComparisonComponent] }).compileComponents();
    fixture = TestBed.createComponent(FacilityAnalysisComparisonComponent);
  });

  it('renders aligned setup, annual results, differences, and both comparison charts', () => {
    setInputs(card('analysis-a', 'Analysis A', 'MMBtu', false), card('analysis-b', 'Analysis B', 'MMBtu', false));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(text).toContain('Analysis A'); expect(text).toContain('Analysis B');
    expect(text).toContain('Analysis setup');
    expect(text).toContain('Group modeling setup');
    expect(text).toContain('Facility annual results');
    expect(text).toContain('Different');
    expect(text).toContain('2024');
    expect(text).not.toContain('Banking');
    expect(fixture.debugElement.queryAll(By.directive(MeterResultsChartStubComponent))).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.v1-analysis-comparison__annual-result')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('[aria-label="Analysis A annual results"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Analysis B annual results"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h4')).toBeNull();
  });

  it('keeps the improvement chart and explains why use cannot be charted across unlike units and bases', () => {
    setInputs(card('analysis-a', 'Analysis A', 'MMBtu', false), card('analysis-b', 'Analysis B', 'kWh', true));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('cannot share one chart');
    expect(fixture.debugElement.queryAll(By.directive(MeterResultsChartStubComponent))).toHaveLength(1);
  });

  it('renders result failures without hiding setup from either analysis', () => {
    const first = card('analysis-a', 'Analysis A', 'MMBtu', false);
    const second = { ...card('analysis-b', 'Analysis B', 'MMBtu', false), outcome: { state: 'blocked' as const, message: 'Setup incomplete' } };
    setInputs(first, second);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Setup incomplete');
    expect(fixture.nativeElement.textContent).toContain('Analysis setup');
    expect(fixture.nativeElement.textContent).toContain('Analysis A');
    expect(fixture.nativeElement.textContent).toContain('Analysis B');
    expect(fixture.nativeElement.textContent).not.toContain('No complete annual results are available for comparison.');
  });

  it('shows the empty annual-results message only after both outcomes are ready', () => {
    const first = {
      ...card('analysis-a', 'Analysis A', 'MMBtu', false),
      outcome: { state: 'loading' as const, message: 'Calculating analysis results' }
    };
    const second = {
      ...card('analysis-b', 'Analysis B', 'MMBtu', false),
      outcome: { state: 'loading' as const, message: 'Calculating analysis results' }
    };
    setInputs(first, second);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Calculating analysis results');
    expect(fixture.nativeElement.textContent).not.toContain('No complete annual results are available for comparison.');

    const readyFirst = {
      ...card('analysis-a', 'Analysis A', 'MMBtu', false),
      outcome: { ...card('analysis-a', 'Analysis A', 'MMBtu', false).outcome, annualAnalysisSummaries: [] }
    };
    const readySecond = {
      ...card('analysis-b', 'Analysis B', 'MMBtu', false),
      outcome: { ...card('analysis-b', 'Analysis B', 'MMBtu', false).outcome, annualAnalysisSummaries: [] }
    };
    fixture.componentRef.setInput('cards', [readyFirst, readySecond]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No complete annual results are available for comparison.');
  });

  function setInputs(first: FacilityAnalysisDashboardCard, second: FacilityAnalysisDashboardCard): void {
    fixture.componentRef.setInput('cards', [first, second]);
    fixture.componentRef.setInput('facility', { fiscalYear: 'calendarYear' });
    fixture.componentRef.setInput('meterGroups', [{ guid: 'group-a', name: 'Main process' }]);
    fixture.componentRef.setInput('analyses', [first.analysis, second.analysis]);
  }
});

@Component({ selector: 'app-meter-results-chart', template: '', standalone: true })
class MeterResultsChartStubComponent {
  @Input() chartRows: readonly MeterResultsChartRow[] = [];
  @Input() metrics: readonly MeterResultsChartMetric[] = [];
  @Input() showAllMetrics = false;
  @Input() showSeriesControls = true;
  @Input() allowNegativeValues = false;
  @Input() showValueLabels = false;
  @Input() sharedYAxis = false;
  @Input() yAxisTitle?: string;
  @Input() period?: string;
  @Input() ariaLabel = '';
  @Input() downloadFileName = '';
  @Input() embedded = false;
}

function card(guid: string, name: string, energyUnit: string, energyIsSource: boolean): FacilityAnalysisDashboardCard {
  const analysis = {
    guid, name, accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy',
    baselineYear: guid === 'analysis-a' ? 2020 : 2021, energyUnit, waterUnit: 'gal', energyIsSource,
    hasBanking: false, groups: [{
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [], applyBanking: false
    }]
  } as IdbAnalysisItem;
  return {
    analysis, category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [],
    isActiveForReporting: false, linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Jan 1, 2025', modifiedSortValue: 0, searchText: name.toLowerCase(), attentionRank: 3,
    outcome: {
      state: 'ready', reportYear: 2024,
      annualAnalysisSummaries: [{
        year: 2024, energyUse: 100, adjusted: 90, savings: 10,
        annualSavingsPercentImprovement: 4, totalSavingsPercentImprovement: 8,
        isBanked: false, isIntermediateBanked: false, savingsBanked: 0, missingPredictorValue: false
      } as any],
      summary: { annual: { periodLabel: '2024', value: 8 }, monthly: { periodLabel: 'Jan 2025', value: 7 } }
    },
    outcomeDisplay: {} as any
  };
}
