import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';

describe('facility report preview foundation', () => {
  it('shows pending availability without claiming successful output or exposing export actions', async () => {
    const { open, harness, updateName } = await setupReportWorkbench();
    await open('report-a', 'report');
    const content: HTMLElement = harness.routeNativeElement!.querySelector('app-facility-report-preview')!;
    expect(content.textContent).toContain('preview is pending migration');
    expect(content.querySelector('button')).toBeNull();
    expect(content.querySelector('canvas')).toBeNull();
    expect(updateName).not.toHaveBeenCalled();
  });
});
