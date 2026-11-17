import { Component, inject } from '@angular/core';
import { singleFacilityAnalysisPairGuard } from '@app/v1/analysis/single-facility-analysis-pair.guard';
import { SingleFacilityAnalysisPairService } from '@app/v1/analysis/single-facility-analysis-pair.service';
import { ReportAnalysisReturnService } from '@app/v1/reports/shared/analysis-inspection/report-analysis-return.service';
import { page, userEvent } from 'vitest/browser';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualitySnapshot } from '../testing/data-quality-report-test-fixtures';
import { expectReportSetupSections } from '../../../testing/report-setup-browser-assertions';

@Component({ standalone: true, providers: [ReportAnalysisReturnService], template: `
  <h1>Inspected analysis</h1>
  @if (reportReturn.origin()) { <button type="button" (click)="reportReturn.returnToReport()">Return to Report</button> }
` })
class InspectedAnalysisDestination {
  readonly reportReturn = inject(ReportAnalysisReturnService);
}

describe('Data Quality Setup in Chromium', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it('opens an unselected analysis through the real route guard and returns after saving the report name', async () => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityAnalyses.push({ ...snapshot.facilityAnalyses[0], id: 31, guid: 'analysis-b', name: 'Another analysis' });
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' });
    const ensurePairs = vi.fn(async () => true);
    const view = await setupReportWorkbench(snapshot.facilityReports,
      [{ provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs } }], snapshot);
    view.router.resetConfig([...view.router.config, {
      path: 'v1/workspace/facility/:facilityGuid/analysis', canActivateChild: [singleFacilityAnalysisPairGuard],
      children: [{ path: 'workbench/:analysisGuid/setup', component: InspectedAnalysisDestination }]
    }]);
    await view.open();
    (view.harness.fixture.nativeElement as HTMLElement).classList.add('v1-root');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Renamed before inspection');
    await page.getByRole('button', { name: 'Inspect Another analysis', exact: true }).click();
    await page.getByRole('button', { name: 'Go To Analysis', exact: true }).click();
    await vi.waitFor(() => expect(view.router.url).toContain('/analysis/workbench/analysis-b/setup?'));
    view.harness.detectChanges();
    expect(view.store.facilityReports()[0].name).toBe('Renamed before inspection');
    expect(view.store.facilityReports()[0].dataQualityReportSettings.selectedAnalysisItemId).toBe('analysis-a');
    expect(ensurePairs).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Return to Report', exact: true }).click();
    await vi.waitFor(() => expect(view.router.url).toBe('/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    view.harness.detectChanges();
    expect(view.harness.routeNativeElement!.querySelector<HTMLInputElement>('#report-workbench-name')!.value).toBe('Renamed before inspection');
    expect(view.store.facilityReports()[0].dataQualityReportSettings.selectedAnalysisItemId).toBe('analysis-a');
  });
  it.each([
    ['light', [], 1100], ['dark', ['v1-theme-dark'], 760],
    ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('supports keyboard controls and a responsive layout in %s', async (_theme, classes, width) => {
    await page.viewport(width, 900);
    const snapshot = dataQualitySnapshot();
    snapshot.meters = [...snapshot.meters, ...Array.from({ length: 100 }, (_, index) => ({ ...snapshot.meters[0],
      id: 1000 + index, guid: `extra-meter-${index}`, name: index === 0
        ? 'Meter with a very long descriptive name and equipment location '.repeat(8)
        : `Additional meter ${String(index).padStart(3, '0')}` }))];
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open();
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '850px', overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    view.harness.detectChanges();
    const setup = host.querySelector('app-data-quality-report-setup')!;
    const sections = expectReportSetupSections(setup.querySelector<HTMLElement>(':scope > .report-setup')!, 3);
    const headerStyle = getComputedStyle(sections[0].querySelector('.setup-section-heading')!);
    for (const heading of setup.querySelectorAll<HTMLElement>('.source-heading h3')) {
      expect(parseFloat(getComputedStyle(heading).fontSize)).toBeLessThan(parseFloat(headerStyle.fontSize));
    }
    const findMeter = () => [...setup.querySelectorAll<HTMLButtonElement>('.source-tag')]
      .find(button => button.querySelector('.source-tag-name')?.textContent?.trim() === 'Meter b')!;
    const meter = findMeter();
    meter.scrollIntoView(); meter.focus(); await userEvent.keyboard(' '); view.harness.detectChanges();
    expect(document.activeElement).toBe(meter); expect(meter.getAttribute('aria-pressed')).toBe('true');
    expectCenteredLabel(meter);
    await userEvent.keyboard('{Enter}'); view.harness.detectChanges();
    expect(meter.getAttribute('aria-pressed')).toBe('false');
    expectCenteredLabel(meter);
    await userEvent.keyboard(' '); view.harness.detectChanges();
    expect(setup.querySelector('#data-quality-meters-heading')?.textContent).toContain('2 selected');
    expect(setup.textContent).not.toContain('Selected data:');
    const tags = setup.querySelector<HTMLElement>('.source-tag-list')!;
    expect(tags.scrollHeight).toBeGreaterThan(tags.clientHeight);
    expect(tags.getBoundingClientRect().height).toBeLessThanOrEqual(18 * parseFloat(getComputedStyle(document.documentElement).fontSize) + 1);
    expect(tags.scrollWidth).toBeLessThanOrEqual(tags.clientWidth + 1);
    expect(setup.querySelector('.source-sections input')).toBeNull();
    for (const tag of setup.querySelectorAll<HTMLButtonElement>('.source-tag')) {
      expectCenteredLabel(tag);
      const icon = tag.querySelector('.source-tag-check')!.getBoundingClientRect();
      const label = tag.querySelector('.source-tag-name')!.getBoundingClientRect();
      expect(label.left - icon.right).toBeGreaterThanOrEqual(8);
      expect(Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2)).toBeLessThanOrEqual(1);
    }
    const matrix = setup.querySelector<HTMLElement>('.content-matrix')!;
    expect(matrix.getBoundingClientRect().width).toBeLessThanOrEqual(Math.min(width, 832));
    for (const option of matrix.querySelectorAll<HTMLLabelElement>('.content-scope .report-setup-option')) {
      const checkbox = option.querySelector('input')!.getBoundingClientRect();
      const text = option.querySelector('span')!.getBoundingClientRect();
      expect(Math.abs(checkbox.y + checkbox.height / 2 - text.y - text.height / 2)).toBeLessThanOrEqual(1);
    }
    const presets = [...setup.querySelectorAll<HTMLButtonElement>('.content-presets button')];
    expect(presets.map(button => button.textContent?.trim())).toEqual(['All content', 'Tables only', 'Charts only', 'Custom']);
    const tablesOnly = presets.find(button => button.textContent?.trim() === 'Tables only')!;
    tablesOnly.scrollIntoView(); tablesOnly.focus(); await userEvent.keyboard('{Enter}'); view.harness.detectChanges();
    expect(tablesOnly.getAttribute('aria-pressed')).toBe('true');
    for (const button of presets) {
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight + 1);
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    }
    const annual = setup.querySelector<HTMLInputElement>('[aria-label="Annual Totals Table"]')!;
    annual.scrollIntoView(); annual.focus(); await userEvent.keyboard(' '); view.harness.detectChanges();
    expect(annual.checked).toBe(false);
    const modes = [...setup.querySelectorAll<HTMLLabelElement>('.selection-mode label')];
    for (const option of modes) {
      const radio = option.querySelector('input')!.getBoundingClientRect();
      const text = option.querySelector('span')!.getBoundingClientRect();
      expect(text.left - radio.right).toBeGreaterThanOrEqual(8);
      expect(Math.abs(radio.y + radio.height / 2 - text.y - text.height / 2)).toBeLessThanOrEqual(1);
    }
    modes[0].querySelector('input')!.click(); view.harness.detectChanges();
    expect(setup.textContent).not.toContain('Select an analysis to continue.');
    const inspect = setup.querySelector<HTMLButtonElement>('[aria-label="Inspect Energy analysis"]')!;
    inspect.scrollIntoView(); inspect.focus(); await userEvent.keyboard('{Enter}'); view.harness.detectChanges();
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Energy analysis');
    expect(dialog.textContent).toContain('Select for report');
    expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(width);
    await userEvent.keyboard('{Escape}'); view.harness.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(inspect);
    modes[1].querySelector('input')!.click(); view.harness.detectChanges();
    findMeter().click(); view.harness.detectChanges();
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    expect(await workbench.editor.flush()).toBe(true);
    await view.open('report-a', 'report');
    const pdf = host.querySelector<HTMLButtonElement>('footer app-report-output-actions button')!;
    await vi.waitFor(() => { view.harness.detectChanges(); expect(pdf.disabled).toBe(false); });
    expect(pdf.title).toBe('');
  });
});

function expectCenteredLabel(tag: HTMLButtonElement): void {
  const button = tag.getBoundingClientRect();
  const label = tag.querySelector('.source-tag-name')!.getBoundingClientRect();
  expect(Math.abs(label.x + label.width / 2 - button.x - button.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(label.y + label.height / 2 - button.y - button.height / 2)).toBeLessThanOrEqual(1);
}
