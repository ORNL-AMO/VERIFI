import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';

describe('account report Data Checks', () => {
  it('offers setup correction for a missing analysis selection without marking the analysis reviewed or visited', async () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = 'betterPlants';
    const { open, harness, updateSetup, store } = await setupAccountReportWorkbench(snapshot);
    await open('account-report', 'data-checks');
    const page = harness.routeNativeElement!.querySelector('app-better-plants-data-checks')!;
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    expect(page.querySelector('a')?.getAttribute('href')).toContain('/account-report/setup');
    expect(page.querySelector('app-analysis-data-checks')).toBeNull();
    expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('footer button.v1-btn--action')!.disabled).toBe(true);
    expect(store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
    expect(store.accountAnalyses()[0].isAnalysisVisited).toBe(false); expect(updateSetup).not.toHaveBeenCalled();
  });
});
