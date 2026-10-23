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

describe('Better Plants explicit review', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('requires the confirmation action and disables it when review cannot be confirmed', async () => {
    const snapshot = analysisReportFixture(), workspace = new AccountWorkspaceStore(); workspace.publish(snapshot);
    const inputs = buildAnalysisReportInputs(snapshot, 'account-analysis'), confirmReview = vi.fn();
    const canConfirm = signal(true);
    await TestBed.configureTestingModule({ imports: [AccountReportsModule], providers: [provideRouter([]),
      { provide: AccountReportWorkbenchContext, useValue: { workspace, findings: signal([]) } },
      { provide: BetterPlantsReportService, useValue: { state: signal({ state: 'ready', value: { checks: [calculateAnalysisDataChecks(inputs, 2023)], reviewed: false } }),
        savingReview: signal(false), reviewError: signal(undefined), canConfirm, confirmReview } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(BetterPlantsDataChecksComponent); fixture.detectChanges();
    expect(confirmReview).not.toHaveBeenCalled();
    const button = fixture.nativeElement.querySelector('button'); button.click();
    expect(confirmReview).toHaveBeenCalledOnce();
    canConfirm.set(false); fixture.detectChanges(); expect(button.disabled).toBe(true);
    expect(workspace.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
  });
});
