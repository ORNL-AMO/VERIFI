import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';
import { reportAnalysisToken } from '../account-report-workbench.models';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { By } from '@angular/platform-browser';

describe('account report Setup', () => {
  it('keeps the report inspector open after a failed save instead of navigating to analysis', async () => {
    const { open, harness, router, updateSetup } = await setupAccountReportWorkbench();
    const workbench = await open();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    updateSetup.mockRejectedValue(new Error('Save failed'));
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.report-analysis-card__inspect')!.click(); harness.detectChanges();
    workbench.editor.form.controls.name.setValue('Unsaved report'); harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[role="dialog"] footer .v1-btn--secondary')!.click();
    await vi.waitFor(() => expect(workbench.editor.state()).toBe('error'));
    expect(navigate).not.toHaveBeenCalled();
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).not.toBeNull();
    expect(workbench.editor.form.controls.name.value).toBe('Unsaved report');
  });
  it.each([false, true])('opens the inspected analysis with a report return after saving, without selecting it for a single facility: %s', async single => {
    const snapshot = accountReportSnapshot(single);
    if (single) snapshot.facilityAnalyses.push({ ...snapshot.facilityAnalyses[0], id: 21, guid: 'other-analysis', name: 'Another analysis' });
    else snapshot.accountAnalyses.push({ ...snapshot.accountAnalyses[0], id: 31, guid: 'other-analysis', name: 'Another analysis' });
    const { open, harness, router, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const selected = workbench.editor.form.controls.analysis.value;
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Inspect Another analysis"]')!.click(); harness.detectChanges();
    const go = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[role="dialog"] footer button')].find(button => button.textContent?.includes('Go To Analysis'))!;
    workbench.editor.form.controls.name.setValue(''); harness.detectChanges(); go.click();
    await vi.waitFor(() => expect(workbench.editor.state()).toBe('invalid'));
    expect(navigate).not.toHaveBeenCalled();
    workbench.editor.form.controls.name.setValue('Renamed report'); harness.detectChanges(); go.click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(single
      ? ['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench', 'other-analysis', 'setup']
      : ['/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'other-analysis', 'setup'],
    { queryParams: { returnReportAccountGuid: 'account-a', returnReportGuid: 'account-report' } }));
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { name: 'Renamed report' });
    expect(workbench.editor.form.controls.analysis.value).toBe(selected);
  });
  it.each([false, true])('updates analysis validation status without editing the report for a single facility: %s', async single => {
    const { open, harness, status, updateSetup } = await setupAccountReportWorkbench(accountReportSnapshot(single));
    const workbench = await open();
    const selected = workbench.editor.form.controls.analysis.value;
    const badge = () => harness.routeNativeElement!.querySelector('.report-analysis-card__status')!;
    expect(badge().textContent).toContain('All data valid');
    expect(badge().classList.contains('v1-chip--success')).toBe(true);

    status.items.set([presentFinding(single
      ? makeFinding('analysis-group.model.invalid', 'warning', 'quality', { kind: 'analysis-group', guid: 'facility-analysis:group-a', name: 'Meter group', accountGuid: 'account-a', facilityGuid: 'facility-a' })
      : makeFinding('account-analysis.children.warning', 'warning', 'quality', { kind: 'account-analysis', guid: 'account-analysis', name: 'Energy analysis', accountGuid: 'account-a' }))]);
    harness.detectChanges();
    expect(badge().textContent).toContain('Has warnings');
    expect(badge().classList.contains('v1-chip--warning')).toBe(true);

    status.items.update(items => [...items, presentFinding(single
      ? makeFinding('analysis.configuration.invalid', 'error', 'configuration', { kind: 'facility-analysis', guid: 'facility-analysis', name: 'Energy analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' })
      : makeFinding('account-analysis.configuration.invalid', 'error', 'configuration', { kind: 'account-analysis', guid: 'account-analysis', name: 'Energy analysis', accountGuid: 'account-a' }))]);
    harness.detectChanges();
    expect(badge().textContent).toContain('Has errors');
    expect(badge().classList.contains('v1-chip--danger')).toBe(true);

    status.state.set('evaluating'); harness.detectChanges();
    expect(badge().textContent).toContain('Checks pending');
    expect(badge().classList.contains('v1-chip--neutral')).toBe(true);
    status.state.set('error'); harness.detectChanges();
    expect(badge().textContent).toContain('Checks unavailable');
    expect(badge().classList.contains('v1-chip--neutral')).toBe(true);

    status.items.set([]); status.state.set('ready'); harness.detectChanges();
    expect(badge().textContent).toContain('All data valid');
    expect(workbench.editor.form.controls.analysis.value).toBe(selected);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it.each([false, true])('filters by type and baseline without changing the selection or saved report for a single facility: %s', async single => {
    const snapshot = accountReportSnapshot(single);
    if (single) {
      snapshot.facilityAnalyses.push(
        { ...snapshot.facilityAnalyses[0], id: 21, guid: 'recent-energy', name: 'Recent energy', baselineYear: 2020 },
        { ...snapshot.facilityAnalyses[0], id: 22, guid: 'water-analysis', name: 'Water analysis', analysisCategory: 'water', baselineYear: 2020 });
    } else {
      snapshot.accountAnalyses.push(
        { ...snapshot.accountAnalyses[0], id: 31, guid: 'recent-energy', name: 'Recent energy', baselineYear: 2020 },
        { ...snapshot.accountAnalyses[0], id: 32, guid: 'water-analysis', name: 'Water analysis', analysisCategory: 'water', baselineYear: 2020 });
    }
    const { open, harness, updateSetup, store } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const root = harness.routeNativeElement!;
    const selected = workbench.editor.form.controls.analysis.value;
    const type = root.querySelector<HTMLSelectElement>('#account-report-analysis-type')!;
    const baseline = root.querySelector<HTMLSelectElement>('#account-report-analysis-baseline')!;
    const names = () => [...root.querySelectorAll('.report-analysis-card:not(.report-analysis-card--empty) strong')].map(item => item.textContent);
    expect([...baseline.options].map(option => option.textContent?.trim())).toEqual(['All baseline years', '2020', '2018']);
    type.value = 'water'; type.dispatchEvent(new Event('change')); harness.detectChanges();
    expect(names()).toEqual(['Water analysis']);
    expect(root.textContent).toContain('Hidden by the current filters');
    baseline.value = [...baseline.options].find(option => option.textContent?.trim() === '2018')!.value;
    baseline.dispatchEvent(new Event('change')); harness.detectChanges();
    expect(names()).toEqual([]);
    expect(root.textContent).toContain('No analyses match these filters');
    expect(workbench.editor.form.controls.analysis.value).toBe(selected);
    expect(updateSetup).not.toHaveBeenCalled();
    const clear = () => [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Clear filters')!;
    clear().click(); harness.detectChanges();
    expect(names()).toEqual(['Energy analysis', 'Recent energy', 'Water analysis']);
    baseline.value = [...baseline.options].find(option => option.textContent?.trim() === '2020')!.value;
    baseline.dispatchEvent(new Event('change')); harness.detectChanges();
    expect(names()).toEqual(['Recent energy', 'Water analysis']);
    clear().click(); harness.detectChanges();
    type.value = 'water'; type.dispatchEvent(new Event('change')); harness.detectChanges();
    const current = store.snapshot()!;
    store.publish({ ...current,
      accountAnalyses: current.accountAnalyses.filter(item => item.guid !== 'water-analysis'),
      facilityAnalyses: current.facilityAnalyses.filter(item => item.guid !== 'water-analysis') });
    harness.detectChanges();
    expect(root.querySelector('#account-report-analysis-type')).toBeNull();
    expect(names()).toEqual(['Energy analysis', 'Recent energy']);
    expect(workbench.editor.form.controls.analysis.value).toBe(selected);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it.each(['energy', 'water'] as const)('hides the type filter for a %s-only account and resets filters when switching reports', async category => {
    const snapshot = accountReportSnapshot();
    snapshot.accountAnalyses[0].analysisCategory = category;
    snapshot.facilityAnalyses[0].analysisCategory = category;
    snapshot.accountReports.push({ ...snapshot.accountReports[0], id: 41, guid: 'other-report' });
    const { open, harness } = await setupAccountReportWorkbench(snapshot);
    await open();
    expect(harness.routeNativeElement!.querySelector('#account-report-analysis-type')).toBeNull();
    const baseline = harness.routeNativeElement!.querySelector<HTMLSelectElement>('#account-report-analysis-baseline')!;
    baseline.selectedIndex = 1; baseline.dispatchEvent(new Event('change')); harness.detectChanges();
    await open('other-report');
    expect(harness.routeNativeElement!.querySelector<HTMLSelectElement>('#account-report-analysis-baseline')!.selectedIndex).toBe(0);
  });
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
    expect(dialog.querySelector('footer .v1-btn--action')?.textContent).toContain('Select for report');
    expect(dialog.querySelector('footer button')?.textContent).toContain('Select for report');
    expect(harness.routeDebugElement!.query(By.css('[role="dialog"] footer .v1-btn--action app-ui-icon')).componentInstance.name).toBe('check');
    dialog.querySelector<HTMLButtonElement>('footer .v1-btn--action')!.click(); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).toBeNull();
    expect(await workbench.editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: single
      ? { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'other-analysis' }
      : { scope: 'account', analysisGuid: 'other-analysis' } });
  });
  it('selects analyses through the cards and offers only eligible analyses', async () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountAnalyses.push({ ...snapshot.accountAnalyses[0], id: 31, guid: 'water-analysis', name: 'Water analysis', analysisCategory: 'water' });
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const radios = [...harness.routeNativeElement!.querySelectorAll<HTMLInputElement>('.report-analysis-card input')];
    expect(radios).toHaveLength(2);
    expect(harness.routeNativeElement!.textContent).not.toContain('Choose later');
    expect(radios.find(input => input.checked)?.closest('label')?.textContent).toContain('Energy analysis');
    expect(workbench.editor.form.controls.analysis.value).toBe(reportAnalysisToken({ scope: 'account', analysisGuid: 'account-analysis' }));
    radios.find(input => input.closest('label')?.textContent?.includes('Water analysis'))!.click();
    harness.detectChanges();
    expect(await workbench.editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: { scope: 'account', analysisGuid: 'water-analysis' } });
  });
  it('retains configuration validation without rendering a findings panel in Setup', async () => {
    const { open, harness, status } = await setupAccountReportWorkbench();
    status.items.set([presentFinding(makeFinding('report.configuration.invalid', 'error', 'configuration', {
      kind: 'account-report', accountGuid: 'account-a', guid: 'account-report', name: 'Saved account report'
    }, { reasons: ['missingReportYear'] }))]);
    const workbench = await open();
    expect(workbench.context.findings()).toHaveLength(1);
    expect(workbench.editor.setupValid()).toBe(false);
    expect(harness.routeNativeElement!.querySelector('#account-report-findings')).toBeNull();
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
