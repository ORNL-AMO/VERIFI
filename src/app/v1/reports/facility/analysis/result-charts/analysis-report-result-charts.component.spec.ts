import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalysisResultChartsComponent } from '@app/v1/shared/analysis-results/result-charts/analysis-result-charts.component';
import { FacilityReportsModule } from '../../facility-reports.module';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportResultChartsComponent } from './analysis-report-result-charts.component';
describe('report chart projections', () => {
  it('retains the shared annual and monthly chart metrics without rounding result data', () => {
    const { results } = facilityAnalysisReportFixture();
    TestBed.configureTestingModule({ imports: [FacilityReportsModule] });
    const fixture = TestBed.createComponent(AnalysisReportResultChartsComponent);
    fixture.componentRef.setInput('period', 'annual'); fixture.componentRef.setInput('unit', 'MMBtu'); fixture.componentRef.setInput('category', 'energy');
    fixture.componentRef.setInput('annual', results.annualAnalysisSummaries);
    expect(fixture.componentInstance.charts().useRows[1].values['actual']).toBe(961.5);
    expect(fixture.componentInstance.charts().improvementMetrics.map(item => item.id)).toEqual(['annualImprovement', 'totalImprovement']);
    fixture.componentRef.setInput('period', 'monthly'); fixture.componentRef.setInput('monthly', results.monthlyAnalysisSummaryData);
    expect(fixture.componentInstance.charts().useRows).toHaveLength(24);
    expect(fixture.componentInstance.charts().improvementMetrics.map(item => item.id)).toEqual(['losses', 'savings']);
    expect(fixture.componentInstance.charts().comparisonBand).toMatchObject({ referenceMetricId: 'actual', comparisonMetricId: 'calculated',
      comparisonAboveColor: 'var(--v1-success)', referenceAboveColor: 'var(--v1-danger)' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(AnalysisResultChartsComponent)).componentInstance.showChartActions()).toBe(false);
    expect(fixture.debugElement.query(By.directive(AnalysisResultChartsComponent)).componentInstance.deferUntilVisible()).toBe(true);
  });

  it('uses facility transition gaps and splits banking series only for banked group charts', () => {
    const { results } = facilityAnalysisReportFixture();
    TestBed.configureTestingModule({ imports: [FacilityReportsModule] });
    const fixture = TestBed.createComponent(AnalysisReportResultChartsComponent);
    const annual = [{ ...results.annualAnalysisSummaries[0], adjusted: 99999 }];
    const groups = [{ ...results.groupSummaries[0], annualAnalysisSummaryData: [{ ...annual[0], isIntermediateBanked: true }] }];
    fixture.componentRef.setInput('period', 'annual'); fixture.componentRef.setInput('unit', 'MMBtu'); fixture.componentRef.setInput('category', 'energy');
    fixture.componentRef.setInput('annual', annual); fixture.componentRef.setInput('groups', groups);
    expect(fixture.componentInstance.charts().useRows[0].values['calculated']).toBeNull();
    expect(fixture.componentInstance.charts().improvementRows[0].values['annualImprovement']).toBeNull();
    const monthly = [{ ...results.monthlyAnalysisSummaryData[0], isBanked: true, rolling12MonthImprovement: 3 }];
    fixture.componentRef.setInput('period', 'monthly'); fixture.componentRef.setInput('monthly', monthly);
    expect(fixture.componentInstance.charts().improvementMetrics.map(metric => metric.id)).toEqual(['losses', 'savings']);
    fixture.componentRef.setInput('scope', 'group');
    expect(fixture.componentInstance.charts().improvementMetrics.map(metric => metric.id)).toEqual(['bankedSavings', 'bankedLosses', 'savings', 'losses']);
    expect(fixture.componentInstance.charts().improvementRows[0].values['bankedSavings']).toBe(3);
  });
});
