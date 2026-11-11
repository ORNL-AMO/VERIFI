import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityReport, dataQualitySnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityReportEditor } from '../editing/data-quality-report-editor.service';

function setup(reports = [dataQualityReport()]) { return setupReportWorkbench(reports, [], dataQualitySnapshot(reports)); }

describe('Data Quality report foundation', () => {
  it('cleans up facility sessions and deleted reports without carrying session preferences or writing settings', async () => {
    const { open, harness, router, store, updateSetup } = await setup();
    const workbench = await open();
    const first = workbench.workbench.session()!;
    first.injector.get(DataQualityReportService).setHistogramBinCount('preference', 9);
    const snapshot = store.snapshot()!;
    const other = dataQualityReport({ id: 20, guid: 'report-b', facilityId: 'facility-b' });
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      facilityReports: [...snapshot.facilityReports, other] });
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-b/reports/workbench/report-b/setup')).toBe(true);
    harness.detectChanges();
    const second = workbench.workbench.session()!;
    expect(first.injector.destroyed).toBe(true);
    expect(second.injector.get(DataQualityReportService).histogramBinCount('preference')()).toBe(50);
    expect(second.injector.get(DataQualityReportEditor).selection().meters).toEqual([]);
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', deleteGuids: ['report-b'] }] });
    harness.detectChanges();
    expect(workbench.workbench.session()).toBeUndefined();
    expect(second.injector.destroyed).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it('uses current source records instead of the saved missingSelection flag and does not repair records on open', async () => {
    const report = dataQualityReport(); report.dataQualityReportSettings.missingSelection = true;
    const { open, harness, store, updateSetup } = await setup([report]);
    const workbench = await open('report-a', 'report');
    const session = workbench.workbench.session()!, results = session.injector.get(DataQualityReportService);
    await vi.waitFor(() => { harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(updateSetup).not.toHaveBeenCalled();
    store.publishCommittedPatch({ collections: [{ collection: 'meters', deleteGuids: ['meter-a'] }] });
    expect(results.state().value).toBeUndefined(); harness.detectChanges();
    await vi.waitFor(() => { harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(results.state().value!.meters).toEqual([]);
    expect(results.state().value!.predictors).toHaveLength(1);
    expect(session.injector.get(DataQualityReportEditor).setupValid()).toBe(true);
    await open('report-a', 'setup');
    expect(harness.routeNativeElement!.textContent).not.toContain('Unavailable meter:');
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it('destroys pending save sessions on account changes and does not apply late responses to the new editor', async () => {
    const second = dataQualityReport({ id: 20, guid: 'report-b', name: 'Other report' });
    const { open, harness, store, updateSetup } = await setup([dataQualityReport(), second]);
    const workbench = await open();
    const oldSession = workbench.workbench.session()!, oldEditor = oldSession.injector.get(DataQualityReportEditor);
    const oldResults = oldSession.injector.get(DataQualityReportService);
    oldResults.setHistogramBinCount('session-preference', 7);
    let resolve!: (report: ReturnType<typeof dataQualityReport>) => void;
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    oldEditor.name.setValue('Pending old save'); const saving = oldEditor.flush();
    // Switching the active account invalidates the session even before its route changes.
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, account: { ...snapshot.account, guid: 'account-b' },
      facilities: snapshot.facilities.map(item => ({ ...item, accountId: 'account-b' })),
      facilityReports: snapshot.facilityReports.map(item => ({ ...item, accountId: 'account-b' })),
      meters: snapshot.meters.map(item => ({ ...item, accountId: 'account-b' })),
      predictors: snapshot.predictors.map(item => ({ ...item, accountId: 'account-b' })) });
    harness.detectChanges();
    expect(oldSession.injector.destroyed).toBe(true);
    const currentWorkbench = await open('report-b');
    const currentSession = currentWorkbench.workbench.session()!, currentEditor = currentSession.injector.get(DataQualityReportEditor);
    resolve(dataQualityReport({ name: 'Pending old save' })); expect(await saving).toBe(false); harness.detectChanges();
    expect(currentEditor.name.value).toBe(second.name);
    expect(currentSession.injector.get(DataQualityReportService).histogramBinCount('session-preference')()).toBe(50);
    expect(store.account()?.guid).toBe('account-b');
    expect(updateSetup).toHaveBeenCalledOnce();
  });
  it('opens saved settings without writes and renders a disabled PDF action through the shared footer', async () => {
    const saved = dataQualityReport();
    const { open, harness, store, updateName, updateSetup } = await setup([saved]);
    const workbench = await open('report-a', 'report');
    expect(workbench.workbench.stages().map(stage => stage.id)).toEqual(['setup', 'report']);
    const preview = harness.routeNativeElement!.querySelector('app-data-quality-report-preview')!;
    await vi.waitFor(() => { harness.detectChanges(); expect(preview.textContent).toContain('No readings found for this meter.'); });
    expect(preview.textContent).toContain('No readings found for this meter.');
    expect(preview.textContent).toContain('PDF export is not available yet.');
    const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>('footer app-report-output-actions button')!;
    expect(button.textContent?.trim()).toBe('PDF');
    expect(button.disabled).toBe(true);
    expect(button.title).toBe('PDF export is not available yet.');
    const output = workbench.workbench.session()!.runtime.output!;
    const generate = vi.spyOn(output, 'generate');
    button.click();
    expect(generate).not.toHaveBeenCalled();
    expect(output.busy()).toBe(false);
    expect(output.state().phase).toBe('idle');
    expect(updateName).not.toHaveBeenCalled();
    expect(updateSetup).not.toHaveBeenCalled();
    expect(store.facilityReports()[0]).toEqual(saved);
    expect(store.committedRevision()).toBeUndefined();
    expect(reportDefinition('facility', 'dataQuality')?.contentImplemented).toBe(true);
  });

  it('saves name edits before stage navigation, retains the session, and preserves all saved report settings', async () => {
    const saved = dataQualityReport();
    const { open, harness, store, updateName, updateSetup } = await setup([saved]);
    const workbench = await open();
    const session = workbench.workbench.session();
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('#report-workbench-name')!;
    expect(input.value).toBe(saved.name);
    expect(input.required).toBe(true);
    input.value = 'Quality review';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await open('report-a', 'report');
    expect(updateName).not.toHaveBeenCalled();
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith(saved.facilityId, saved.guid, { name: 'Quality review' });
    expect(store.facilityReports()[0]).toEqual({ ...saved, name: 'Quality review' });
    expect(workbench.workbench.session()).toBe(session);
    await open();
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#report-workbench-name')!.value).toBe('Quality review');
    expect(workbench.workbench.session()).toBe(session);
  });

  it('protects invalid and failed name drafts and allows stage navigation after retry', async () => {
    const { open, harness, router, updateSetup } = await setup();
    const workbench = await open();
    const reportUrl = '/v1/workspace/facility/facility-a/reports/workbench/report-a/report';
    workbench.editor.name.setValue(' ');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('footer button.v1-btn--action')!.disabled).toBe(true);
    expect(await router.navigateByUrl(reportUrl)).toBe(false);
    expect(updateSetup).not.toHaveBeenCalled();
    workbench.editor.discard();
    updateSetup.mockRejectedValueOnce(new Error('Save unavailable'));
    workbench.editor.name.setValue('Unsaved quality report');
    expect(await router.navigateByUrl(reportUrl)).toBe(false);
    expect(workbench.editor.name.value).toBe('Unsaved quality report');
    expect(workbench.editor.error()).toBe('Save unavailable');
    workbench.editor.retry();
    expect(await workbench.editor.flush()).toBe(true);
    expect(await router.navigateByUrl(reportUrl)).toBe(true);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('app-data-quality-report-preview')).not.toBeNull();
  });

  it('flushes report switching, creates an isolated runtime, and reopens the saved name', async () => {
    const first = dataQualityReport();
    const second = dataQualityReport({ id: 20, guid: 'report-b', name: 'Other quality report' });
    const { open, harness, store, router } = await setup([first, second]);
    const workbench = await open();
    const session = workbench.workbench.session();
    workbench.editor.name.setValue('Renamed quality report');
    workbench.switchReport(second.guid);
    await harness.fixture.whenStable();
    expect(router.url).toContain('/report-b/setup');
    expect(workbench.workbench.session()).not.toBe(session);
    expect(workbench.editor.name.value).toBe(second.name);
    expect(store.facilityReports().find(report => report.guid === first.guid)).toEqual({ ...first, name: 'Renamed quality report' });
    await open();
    expect(workbench.editor.name.value).toBe('Renamed quality report');
    await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard?facility=facility-a');
    expect(workbench.workbench.session()).toBeUndefined();
  });
});
