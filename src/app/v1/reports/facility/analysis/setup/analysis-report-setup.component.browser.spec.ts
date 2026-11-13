import { page, userEvent } from 'vitest/browser';
import { of } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { reportFixture } from '../../testing/report-test-fixtures';
import { expectReportSetupSections } from '../../../testing/report-setup-browser-assertions';

describe('facility Analysis setup matrix in Chromium', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it.each([
    ['light', [], 1100], ['dark', ['v1-theme-dark'], 760],
    ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('uses the same connected Setup headers for placeholder reports in %s', async (_theme, classes, width) => {
    await page.viewport(width, 900);
    const view = await setupReportWorkbench([reportFixture({ facilityReportType: 'overview' })]);
    await view.open();
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px` });
    const setup = host.querySelector<HTMLElement>('app-facility-report-setup .report-setup')!;
    expectReportSetupSections(setup, 2);
    expect(setup.scrollWidth).toBeLessThanOrEqual(setup.clientWidth + 1);
    expect(view.updateName).not.toHaveBeenCalled();
  });
  it.each([
    ['light', [], 1100], ['dark', ['v1-theme-dark'], 760],
    ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('keeps separate preset toggles readable with accessible keyboard selection in %s', async (_theme, classes, width) => {
    await page.viewport(width, 900);
    const { report, snapshot, meters } = facilityAnalysisReportFixture();
    const view = await setupReportWorkbench([report], [{ provide: WorkspaceCalendarizationService,
      useValue: { calendarizeBase: () => of({ state: 'ready', meters }), project: () => ({ state: 'ready', meters }) } }], snapshot);
    const workbench = await view.open('facility-report');
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '850px', overflow: 'auto', '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    view.harness.detectChanges();
    expectReportSetupSections(host.querySelector<HTMLElement>('.report-section.report-setup')!, 4);
    const name = host.querySelector<HTMLInputElement>('#report-workbench-name')!;
    const year = host.querySelector<HTMLSelectElement>('#facility-analysis-report-year')!;
    expect(year.closest('.report-setup-section')).toBe(name.closest('.report-setup-section'));
    if (width > 992) expect(year.getBoundingClientRect().left).toBeGreaterThan(name.getBoundingClientRect().right);
    else expect(year.getBoundingClientRect().top).toBeGreaterThanOrEqual(name.getBoundingClientRect().bottom);
    const toggles = [...host.querySelectorAll<HTMLButtonElement>('.content-preset')];
    const preset = toggles.find(button => button.textContent?.trim() === 'Facility Detail')!;
    expect(toggles).toHaveLength(6);
    preset.scrollIntoView(); preset.click(); view.harness.detectChanges(); preset.focus();
    expect(document.activeElement).toBe(preset);
    expect(preset.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{Tab}{Enter}'); view.harness.detectChanges();
    expect(toggles.find(button => button.textContent?.trim() === 'Facility+Groups Detail')!.getAttribute('aria-pressed')).toBe('true');
    preset.click(); preset.focus(); view.harness.detectChanges();
    expect(host.querySelector('.content-presets input')).toBeNull();
    for (const toggle of toggles) {
      expect(getComputedStyle(toggle).whiteSpace).toBe('nowrap');
    }
    for (let index = 1; index < toggles.length; index++) {
      const current = toggles[index].getBoundingClientRect(), previous = toggles[index - 1].getBoundingClientRect();
      if (Math.abs(current.top - previous.top) < 1) expect(current.left).toBeGreaterThan(previous.right);
      else expect(current.top).toBeGreaterThan(previous.bottom);
    }
    const custom = toggles.at(-1)!;
    custom.focus();
    const strip = host.querySelector<HTMLElement>('.content-presets')!.getBoundingClientRect();
    expect(custom.getBoundingClientRect().right).toBeLessThanOrEqual(strip.right + 1);
    preset.focus();
    expect(workbench.editor.form.controls.settings.getRawValue().groupReports).toBe(false);
    const row = host.querySelector<HTMLElement>('[data-content-section=facilityMonthlyResults]')!;
    expect([...row.querySelectorAll('input')].every(input => !input.disabled && input.checked)).toBe(true);
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    const matrix = host.querySelector<HTMLElement>('.content-matrix')!;
    expect(matrix.getBoundingClientRect().width).toBeLessThanOrEqual(width);
    expect(matrix.getBoundingClientRect().width).toBeLessThanOrEqual(832);
    if (width > 1000) {
      const annual = matrix.querySelector<HTMLElement>('[data-content-section=facilityAnnualResults]')!;
      const label = annual.querySelector('th')!.getBoundingClientRect();
      const tableControl = annual.querySelector('td input')!.getBoundingClientRect();
      expect(tableControl.left - label.right).toBeLessThan(96);
    }
    const columns = host.querySelector<HTMLElement>('.report-table-columns')!;
    expect(columns.getBoundingClientRect().top).toBeGreaterThanOrEqual(matrix.getBoundingClientRect().bottom);
    const columnControl = columns.querySelector<HTMLInputElement>('input')!;
    columnControl.scrollIntoView(); columnControl.focus();
    expect(document.activeElement).toBe(columnControl);
    columnControl.click(); view.harness.detectChanges();
    expect(host.querySelector('app-analysis-column-picker')).toBeNull();
    expect(host.querySelector('[role=dialog]')).toBeNull();
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    expect(await workbench.editor.flush()).toBe(true);
    await view.router.navigateByUrl('/v1/workspace/account/account/reports/dashboard');
    await view.open('facility-report'); view.harness.detectChanges();
    expect(view.harness.routeNativeElement!.querySelector('.content-preset[aria-pressed=true]')?.textContent).toContain('Facility Detail');
    expect(view.harness.routeNativeElement!.querySelector<HTMLInputElement>('.report-table-columns input')!.checked).toBe(false);
  });
});
