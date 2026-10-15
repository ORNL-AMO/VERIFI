import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';

describe('facility report Setup', () => {
  it('edits only the name and shows saved context separately from pending report settings', async () => {
    const { open, harness, updateName } = await setupReportWorkbench();
    const workbench = await open();
    const content: HTMLElement = harness.routeNativeElement!.querySelector('app-facility-report-setup')!;
    expect(content.querySelector('label')?.getAttribute('for')).toBe('report-workbench-name');
    expect(content.querySelector('input')?.value).toBe('Saved report');
    expect(content.querySelector('select')).toBeNull();
    expect(content.querySelector('dl')).toBeNull();
    expect(content.textContent).not.toContain('Owner');
    expect(harness.routeNativeElement!.querySelector('header dl')?.textContent).toContain('Reporting period');
    expect(content.textContent).toContain('settings are pending migration');
    workbench.editor.name.setValue(' ');
    harness.detectChanges();
    expect(content.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(updateName).not.toHaveBeenCalled();
  });
});
