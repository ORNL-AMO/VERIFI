import { accountReportSnapshot } from '../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../testing/account-report-workbench-test-setup';

describe('account report preview foundation', () => {
  it('shows pending content separately from setup readiness and exposes no export actions', async () => {
    const { open, harness, updateSetup } = await setupAccountReportWorkbench({ ...accountReportSnapshot(), accountReports: accountReportSnapshot().accountReports.map(report => ({ ...report, reportType: 'dataOverview' })) });
    await open('account-report', 'report');
    const content = harness.routeNativeElement!.querySelector('app-pending-report-stage')!;
    expect(content.textContent).toContain('Report content pending'); expect(content.textContent).toContain('Setup readiness does not indicate');
    expect(content.querySelector('button')).toBeNull(); expect(updateSetup).not.toHaveBeenCalled();
  });
});
