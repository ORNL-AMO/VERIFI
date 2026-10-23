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
    expect(fixture.nativeElement.textContent.includes('Critical issues')).toBe(method === 'regression');
  });
});
