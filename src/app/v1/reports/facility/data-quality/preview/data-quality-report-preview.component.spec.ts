import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityReport, dataQualitySnapshot } from '../testing/data-quality-report-test-fixtures';

function setup(reports = [dataQualityReport()]) { return setupReportWorkbench(reports, [], dataQualitySnapshot(reports)); }

describe('Data Quality report foundation', () => {
  it('opens saved settings without writes and renders a disabled PDF action through the shared footer', async () => {
    const saved = dataQualityReport();
    const { open, harness, store, updateName, updateSetup } = await setup([saved]);
    const workbench = await open('report-a', 'report');
    expect(workbench.workbench.stages().map(stage => stage.id)).toEqual(['setup', 'report']);
    const preview = harness.routeNativeElement!.querySelector('app-data-quality-report-preview')!;
    expect(preview.querySelector('[role="status"]')?.textContent).toContain('results are being implemented');
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
    expect(reportDefinition('facility', 'dataQuality')?.contentImplemented).toBe(false);
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
