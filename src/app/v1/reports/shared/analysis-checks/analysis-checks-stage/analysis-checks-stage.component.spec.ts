import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportAnalysisChecksStageComponent } from './analysis-checks-stage.component';

describe('shared report analysis checks stage', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReportsSharedModule], providers: [provideRouter([])] }));
  afterEach(() => TestBed.resetTestingModule());

  it.each(['idle', 'waiting', 'loading', 'review-required'] as const)('announces %s readiness without showing stale checks or acknowledgment controls', state => {
    const fixture = TestBed.createComponent(ReportAnalysisChecksStageComponent);
    fixture.componentRef.setInput('state', { key: 'report', state, message: 'Checking current report inputs' });
    fixture.componentRef.setInput('setupRoute', ['/setup']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Checking current report inputs');
    expect(fixture.nativeElement.querySelector('app-analysis-data-checks')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-analysis-checks-acknowledgment, button')).toBeNull();
  });

  it('shows a retryable error and setup link without emitting any action on entry', () => {
    const fixture = TestBed.createComponent(ReportAnalysisChecksStageComponent), retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);
    fixture.componentRef.setInput('state', { key: 'report', state: 'error', message: 'Checks failed' });
    fixture.componentRef.setInput('setupRoute', ['/report', 'setup']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Checks failed');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/report/setup');
    expect(retry).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('button').click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders current results and labels through the checks overview without duplicating footer acknowledgment', () => {
    const fixture = TestBed.createComponent(ReportAnalysisChecksStageComponent);
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    const group = check.groups[0];
    fixture.componentRef.setInput('state', { key: 'report', state: 'ready', value: { checks: [check] } });
    fixture.componentRef.setInput('setupRoute', ['/setup']);
    fixture.componentRef.setInput('groupNames', { [group.group.idbGroupId]: 'Current group name' });
    fixture.componentRef.setInput('facilityNames', { [group.facilityGuid]: 'Current facility name' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-analysis-data-checks')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Current group name');
    expect(fixture.nativeElement.textContent).toContain('Current facility name');
    expect(fixture.nativeElement.querySelector('app-analysis-checks-acknowledgment')).toBeNull();
    expect(fixture.nativeElement.querySelector('button.v1-btn--secondary')).toBeNull();
  });
});
