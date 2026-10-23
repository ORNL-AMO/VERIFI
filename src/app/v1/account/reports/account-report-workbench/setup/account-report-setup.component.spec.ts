import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';
import { reportAnalysisToken } from '../account-report-workbench.models';

describe('account report Setup', () => {
  it('selects analyses through the cards and clears the link only when Choose later is selected', async () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountAnalyses.push({ ...snapshot.accountAnalyses[0], id: 31, guid: 'water-analysis', name: 'Water analysis', analysisCategory: 'water' });
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const radios = [...harness.routeNativeElement!.querySelectorAll<HTMLInputElement>('.report-analysis-card input')];
    expect(radios.find(input => input.checked)?.closest('label')?.textContent).toContain('Energy analysis');
    expect(workbench.editor.form.controls.analysis.value).toBe(reportAnalysisToken({ scope: 'account', analysisGuid: 'account-analysis' }));
    radios.find(input => input.closest('label')?.textContent?.includes('Water analysis'))!.click();
    harness.detectChanges();
    expect(await workbench.editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: { scope: 'account', analysisGuid: 'water-analysis' } });
    radios[radios.length - 1].click();
    harness.detectChanges();
    expect(await workbench.editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: null });
  });
  it('keeps unavailable saved references visible and exposes explicit refresh without changing records on entry', async () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses[0].name = 'Old paired name';
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    expect(harness.routeNativeElement!.querySelector('app-account-report-setup')!.textContent).toContain('Refresh analysis link');
    expect(updateSetup).not.toHaveBeenCalled(); workbench.editor.refreshLink(); await workbench.editor.flush();
    expect(updateSetup).toHaveBeenCalledWith('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
  });
});
