import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';

describe('account report preview foundation', () => {
  it('shows pending content separately from setup readiness and exposes no export actions', async () => {
    const { open, harness, updateSetup } = await setupAccountReportWorkbench();
    await open('account-report', 'report');
    const content = harness.routeNativeElement!.querySelector('app-account-report-preview')!;
    expect(content.textContent).toContain('Report content pending'); expect(content.textContent).toContain('Setup readiness does not indicate');
    expect(content.querySelector('button')).toBeNull(); expect(updateSetup).not.toHaveBeenCalled();
  });
});
