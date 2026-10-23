import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';
import { reportAnalysisToken } from '../account-report-workbench.models';

describe('account report Setup', () => {
  it.each([false, true])('inspects an unselected analysis without editing, then explicitly selects it for a single facility: %s', async single => {
    const snapshot = accountReportSnapshot(single);
    if (single) snapshot.facilityAnalyses.push({ ...snapshot.facilityAnalyses[0], id: 21, guid: 'other-analysis', name: 'Another analysis' });
    else snapshot.accountAnalyses.push({ ...snapshot.accountAnalyses[0], id: 31, guid: 'other-analysis', name: 'Another analysis' });
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const original = workbench.editor.form.controls.analysis.value;
    const inspect = harness.routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Inspect Another analysis"]')!;
    inspect.click(); harness.detectChanges();
    let dialog = harness.routeNativeElement!.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Another analysis');
    expect(dialog.textContent).toContain(single ? 'Used by' : 'Facility selections');
    expect(workbench.editor.form.controls.analysis.value).toBe(original);
    expect(updateSetup).not.toHaveBeenCalled();
    dialog.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')!.click(); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).toBeNull();
    expect(workbench.editor.form.controls.analysis.value).toBe(original);
    inspect.click(); harness.detectChanges();
    dialog = harness.routeNativeElement!.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('footer button')?.textContent).toContain('Select for report');
    dialog.querySelector<HTMLButtonElement>('footer button')!.click(); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).toBeNull();
    expect(await workbench.editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: single
      ? { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'other-analysis' }
      : { scope: 'account', analysisGuid: 'other-analysis' } });
  });
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
