import { TestBed } from '@angular/core/testing';
import { FacilityReportsModule } from '../../facility-reports.module';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportResultsTableComponent } from './analysis-report-results-table.component';
describe('report result tables', () => {
  it('renders report-owned columns and accessible period headers without changing settings', () => {
    const { report, results, facility } = facilityAnalysisReportFixture();
    TestBed.configureTestingModule({ imports: [FacilityReportsModule] });
    const fixture = TestBed.createComponent(AnalysisReportResultsTableComponent);
    fixture.componentRef.setInput('annual', results.annualAnalysisSummaries); fixture.componentRef.setInput('period', 'annual');
    fixture.componentRef.setInput('columns', report.analysisReportSettings.analysisTableColumns);
    fixture.componentRef.setInput('unit', 'MMBtu'); fixture.componentRef.setInput('caption', 'Facility annual results'); fixture.componentRef.setInput('facility', facility);
    fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('caption')?.textContent).toContain('Facility annual results');
    expect(root.querySelector('app-analysis-results-table table')?.classList.contains('v1-analysis-results-table')).toBe(true);
    expect(root.querySelector('th[scope=colgroup]')?.textContent).toContain('Energy');
    expect(root.querySelectorAll('tbody th[scope=row]')).toHaveLength(2);
    expect(root.textContent).toContain('1,203');
    const columns = { ...report.analysisReportSettings.analysisTableColumns, actualEnergy: false };
    fixture.componentRef.setInput('columns', columns); fixture.detectChanges();
    expect(root.querySelector('thead')?.textContent).not.toContain('Actual use');
    expect(report.analysisReportSettings.analysisTableColumns.actualEnergy).toBe(true);
  });
});
