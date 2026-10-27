import { TestBed } from '@angular/core/testing';
import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';

describe('Better Plants settings', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['energy', 'water'] as const)('shows category-specific fields and retains hidden settings for %s', async category => {
    const snapshot = accountReportSnapshot();
    snapshot.accountReports[0].reportType = 'betterPlants';
    snapshot.accountReports[0].betterPlantsReportSetup.analysisItemId = 'account-analysis';
    snapshot.accountAnalyses[0].analysisCategory = category;
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    expect(!!harness.routeNativeElement!.querySelector('#better-plants-methodology')).toBe(category === 'water');
    expect(!!harness.routeNativeElement!.querySelector('#better-plants-baseline-metric')).toBe(category === 'water');
    expect(updateSetup).not.toHaveBeenCalled();
    workbench.editor.form.controls.betterPlants.controls.includePerformanceTable.setValue(true);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('input[formcontrolname="includeFacilityNames"]')).not.toBeNull();
    workbench.editor.discard();
  });
});
