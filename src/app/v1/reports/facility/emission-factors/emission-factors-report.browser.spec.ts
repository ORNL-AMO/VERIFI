import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';
import { EmissionFactorsReportService } from './emission-factors-report.service';

describe('Emission Factors report in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); await page.viewport(1280, 900); });
  it.each([
    ['light', [], 1280], ['dark', ['v1-theme-dark'], 760], ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 390]
  ] as const)('supports the complete journey, native year choices, and responsive category containers in %s', async (_theme, classes, width) => {
    // UI/period coverage uses the shared service's synchronous fallback. Native Worker transport has its own suite.
    vi.stubGlobal('Worker', undefined);
    await page.viewport(width, 1000);
    const snapshot = emissionFactorsSnapshot(); snapshot.meters[0].name = 'Purchased electricity for the production area with a long descriptive name';
    const view = await setupReportWorkbench(snapshot.facilityReports, [
      { provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } },
      { provide: WorkspaceCalendarizationService, useClass: WorkspaceCalendarizationService }
    ], snapshot);
    const workbench = await view.open();
    const root = view.harness.fixture.nativeElement as HTMLElement;
    root.className = ['v1-root', 'v1-palette-blueprint', ...classes].join(' ');
    root.style.width = '100%'; root.style.minWidth = '0'; root.style.display = 'block';
    const service = workbench.workbench.session()!.injector.get(EmissionFactorsReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.years()).toEqual([2022, 2023, 2024]); });
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Facility factors');
    const start = root.querySelector<HTMLSelectElement>('#emission-factors-start')!;
    start.focus(); await userEvent.keyboard('{ArrowDown}');
    expect(start.value).not.toBe('');
    await page.getByRole('link', { name: 'Continue', exact: true }).click();
    await vi.waitFor(() => { view.harness.detectChanges(); expect(root.querySelectorAll('table')).toHaveLength(2); });
    expect(view.store.facilityReports()[0].name).toBe('Facility factors');
    const categories = [...root.querySelectorAll<HTMLElement>('.report-document')];
    expect(categories).toHaveLength(2);
    for (const category of categories) {
      expect(category.querySelectorAll('table')).toHaveLength(1);
      expect(category.getBoundingClientRect().right).toBeLessThanOrEqual(width + 1);
      expect(category.scrollWidth).toBeLessThanOrEqual(category.clientWidth);
      const table = category.querySelector<HTMLElement>('.factor-table')!;
      expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth);
    }
    expect(categories[1].getBoundingClientRect().top).toBeGreaterThan(categories[0].getBoundingClientRect().bottom);
    await view.harness.fixture.whenStable();
    expect(root.querySelector('app-report-output-actions')).not.toBeNull();
    expect(root.querySelector('footer')?.textContent).toContain('Present');
    await view.open(); expect(service.editor.name.value).toBe('Facility factors');
  });
});
