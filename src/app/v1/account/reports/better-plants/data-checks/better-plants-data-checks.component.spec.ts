import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AccountReportsModule } from '../../account-reports.module';
import { AccountReportWorkbenchContext } from '../../account-report-workbench/account-report-workbench-context.service';
import { BetterPlantsReportService } from '../better-plants-report.service';
import { BetterPlantsDataChecksComponent } from './better-plants-data-checks.component';

describe('Better Plants check composition', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders shared checks without acknowledging or duplicating the footer control', async () => {
    const snapshot = analysisReportFixture(), workspace = new AccountWorkspaceStore(); workspace.publish(snapshot);
    const inputs = buildAnalysisReportInputs(snapshot, 'account-analysis'), confirmReview = vi.fn();
    await TestBed.configureTestingModule({ imports: [AccountReportsModule], providers: [provideRouter([]),
      { provide: AccountReportWorkbenchContext, useValue: { workspace, findings: signal([]) } },
      { provide: BetterPlantsReportService, useValue: { state: signal({ state: 'ready', value: { checks: [calculateAnalysisDataChecks(inputs, 2023)], reviewed: false } }),
        confirmReview } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(BetterPlantsDataChecksComponent); fixture.detectChanges();
    expect(confirmReview).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-analysis-data-checks')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-analysis-checks-acknowledgment, [aria-label="Confirm analysis review"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Issues summary');
    expect(fixture.nativeElement.textContent).toContain('Executive summary');
    const inspect = fixture.nativeElement.querySelector('.validation-toggle') as HTMLButtonElement;
    expect(inspect).not.toBeNull();
    inspect.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.validation-detail')).not.toBeNull();
    expect(confirmReview).not.toHaveBeenCalled();
    expect(workspace.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
  });
});
