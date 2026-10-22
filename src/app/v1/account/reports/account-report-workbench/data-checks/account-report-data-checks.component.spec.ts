import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';

describe('account report Data Checks foundation', () => {
  it('does not complete checks or mark the linked analysis visited', async () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = 'betterPlants';
    const { open, harness, updateSetup, store } = await setupAccountReportWorkbench(snapshot);
    await open('account-report', 'data-checks');
    expect(harness.routeNativeElement!.querySelector('app-account-report-data-checks')!.textContent).toContain('does not complete checks');
    expect(store.accountAnalyses()[0].isAnalysisVisited).toBe(false); expect(updateSetup).not.toHaveBeenCalled();
  });
});
