import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FacilityReportsModule } from '../../facility-reports.module';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { AnalysisReportDataChecksComponent } from './analysis-report-data-checks.component';
describe('facility report check states', () => {
  it('shows a retryable failure and returns to setup without acknowledging issues', () => {
    const retry = vi.fn(), confirmReview = vi.fn();
    TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [provideRouter([]),
      { provide: FacilityAnalysisReportService, useValue: { state: signal({ state: 'error', message: 'Model checks unavailable' }),
        setupRoute: () => ['/setup'], context: { findings: () => [] }, groupNames: () => ({}), facilityNames: () => ({}), retry, confirmReview } } ] });
    const fixture = TestBed.createComponent(AnalysisReportDataChecksComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Model checks unavailable');
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledOnce(); expect(confirmReview).not.toHaveBeenCalled();
  });
});
