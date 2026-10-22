import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';

describe('account report Setup', () => {
  it('keeps unavailable saved references visible and exposes explicit refresh without changing records on entry', async () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses[0].name = 'Old paired name';
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    expect(harness.routeNativeElement!.querySelector('app-account-report-setup')!.textContent).toContain('Refresh analysis link');
    expect(updateSetup).not.toHaveBeenCalled(); workbench.editor.refreshLink(); await workbench.editor.flush();
    expect(updateSetup).toHaveBeenCalledWith('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
  });
});
