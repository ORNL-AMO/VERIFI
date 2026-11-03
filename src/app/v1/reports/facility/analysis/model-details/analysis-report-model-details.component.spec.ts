import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalysisModelComparisonChartComponent } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.component';
import { FacilityReportsModule } from '../../facility-reports.module';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { AnalysisReportModelDetailsComponent } from './analysis-report-model-details.component';
describe('report model details', () => {
  it('uses the checked model equation and preserves predictor-validation failures', () => {
    const inputs = buildFacilityAnalysisReportInputs(regressionAnalysisReportFixture(), 'facility', 'facility-analysis');
    const checked = calculateAnalysisDataChecks(inputs, 2023).groups[0];
    TestBed.configureTestingModule({ imports: [FacilityReportsModule] });
    const fixture = TestBed.createComponent(AnalysisReportModelDetailsComponent);
    fixture.componentRef.setInput('checked', checked); fixture.componentRef.setInput('monthly', []); fixture.componentRef.setInput('unit', 'MMBtu');
    const details = fixture.componentInstance.view();
    expect(details.formula).toContain('Predictor 0'); expect(details.formula).toContain('Predictor 1');
    expect(details.validation.some(row => row.cells.some(cell => cell.failed))).toBe(true);
    fixture.componentRef.setInput('monthly', [{ date: new Date(2023, 0, 1), fiscalYear: 2023, energyUse: 12.123456789, modeledEnergy: 99999, isIntermediateBanked: true }]);
    fixture.detectChanges();
    const chart = fixture.debugElement.query(By.directive(AnalysisModelComparisonChartComponent)).componentInstance as AnalysisModelComparisonChartComponent;
    expect(chart.deferUntilVisible()).toBe(true);
    expect((chart.option() as any).series.map((series: any) => series.type)).toEqual(['scatter', 'line']);
    expect((chart.option() as any).series[0].data).toEqual([12.123456789]);
    expect((chart.option() as any).series[1].data).toEqual([null]);
  });
});
