import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts/core';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { cdp, page, userEvent } from 'vitest/browser';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { account, facility, meter, reading, calendarizedMeter, monthlyData, group } from '../facility-meters.testing';
import { buildMeterCards } from '../models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { MetersDashboardComponent } from './meters-dashboard.component';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/account/data/portfolio/portfolio-browser-test.helpers';

@Component({ standalone: true, imports: [MetersDashboardComponent, PortalModule],
  template: '<div class="v1-root"><main style="height:700px;overflow:auto"><app-meters-dashboard/></main><ng-template [cdkPortalOutlet]="portal.activePortal()"/></div>' })
class DashboardHost { readonly portal = inject(ModalPortalService); }

describe('facility meter list and monthly charts in Chromium', () => {
  it('supports cards, independent slide-up charts, legend controls, actions, focus, resizing and print', async () => {
    await page.viewport(1600, 1000);
    const meters = signal(Array.from({ length: 64 }, (_, index) => meter({ id: index + 1, guid: `meter-${index}`, name: index === 0 ? 'A very long meter name with factory wing and production line identifiers' : `Meter ${index.toString().padStart(2, '0')}`,
      source: index % 3 === 0 ? 'Water Intake' : index % 3 === 1 ? 'Electricity' : 'Natural Gas', groupId: 'g' })));
    const data = signal(meters().map((item, index) => reading({ id: index + 1, guid: `reading-${index}`, meterId: item.guid })));
    const calendarized = computed(() => meters().map((item, index) => calendarizedMeter(item, Array.from({ length: 36 - index % 6 }, (_, monthIndex) => monthlyData({ year: 2023 + Math.floor(monthIndex / 12), monthNumValue: monthIndex % 12,
      energyUse: (index + 1) * 15 + monthIndex % 12 * 5, energyConsumption: (index + 1) * 20, energyCost: 100 + index * 5 + monthIndex * 2 })), { showEnergyUse: item.source !== 'Water Intake' })));
    const cards = computed(() => buildMeterCards(meters(), data(), [group({ guid: 'g' })]).map((card, index) => ({ ...card, statusTone: (index % 3 === 0 ? 'danger' : index % 3 === 1 ? 'warning' : 'success') as 'danger' | 'warning' | 'success' })));
    const actions = { createMeter: vi.fn(), copyMeter: vi.fn().mockResolvedValue(meter({ guid: 'copied' })), deleteMeters: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ imports: [DashboardHost], providers: [provideRouter([]), ModalPortalService,
      { provide: FacilityMetersWorkspaceService, useValue: { account: signal(account()), facility: signal(facility({ energyUnit: 'MMBtu', volumeLiquidUnit: 'gal' })), meterCards: cards, meterData: data, meterGroups: signal([]), facilityCalendarizedMeters: calendarized, statusState: signal('ready'), calendarizationState: signal('ready'), canWrite: signal(true), hasPending: signal(false) } },
      { provide: WorkspaceNavigationService, useValue: { facilityMeterGroupRoute: (guid: string, id: string) => ['/facility', guid, 'meter-grouping', id, 'monthly-table'], isSingleSiteWorkspace: signal(false),
          accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'facilities'],
      accountDataRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio'], facilityMeterRoute: (guid: string, id: string, tab: string) => ['/v1', 'workspace', 'facility', guid, 'data', 'meters', id, tab] } }
    ] });
    TestBed.overrideComponent(MetersDashboardComponent, { set: { providers: [{ provide: MetersDashboardActionsService, useValue: actions }] } });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DashboardHost); fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
    const component = fixture.debugElement.query(By.directive(MetersDashboardComponent)).componentInstance as MetersDashboardComponent;
    const visibleCards = () => host.querySelectorAll('.portfolio-inventory .portfolio-tile');
    await vi.waitFor(() => expect(visibleCards()).toHaveLength(24));
    const toolbar = host.querySelector<HTMLElement>('.facility-meters__toolbar')!;
    expect(toolbar.querySelector('.facility-meters__select')?.textContent).toContain('Select meters');
    expect(host.querySelector('.facility-meters__inventory > h2')).toBeNull();
    expect(host.querySelector('.facility-meters__selection')).toBeNull();
    for (const width of [1600, 1150, 900]) {
      await page.viewport(width, 1000);
      const searchBottom = toolbar.querySelector('input')!.getBoundingClientRect().bottom;
      for (const control of toolbar.querySelectorAll('select,button')) {
        expect(control.getBoundingClientRect().bottom).toBeCloseTo(searchBottom, 0);
      }
    }
    await page.viewport(1600, 1000);
    expect(host.querySelector('canvas')).toBeNull();
    expect(host.querySelector('.portfolio-tile__name svg')).toBeNull();
    const handle = host.querySelector<HTMLButtonElement>('.inventory-chart-dock__handle')!;
    expect(handle.getBoundingClientRect().bottom).toBeCloseTo(1000, 0);
    await page.getByRole('button', { name: 'Next', exact: true }).click(); fixture.detectChanges();
    expect(component.currentPage()).toBe(2); expect(visibleCards()).toHaveLength(24);
    await page.getByRole('button', { name: 'Previous', exact: true }).click(); fixture.detectChanges();
    const search = page.getByRole('searchbox', { name: 'Find meter, source, group, or status' });
    await search.fill('Electricity'); fixture.detectChanges();
    expect(component.filteredMeterCards()).toHaveLength(21);
    expect(component.chartViews().find(chart => chart.id === 'cost')?.metrics).toHaveLength(64);
    handle.focus(); await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    await vi.waitFor(() => expect(host.querySelectorAll('canvas')).toHaveLength(1));
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(handle.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog.getBoundingClientRect().height).toBeGreaterThan(950);
    const chartElement = dialog.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
    const chart = echarts.getInstanceByDom(chartElement)!;
    const series = () => (chart.getOption() as any).series.filter((item: any) => item?.type === 'line');
    await vi.waitFor(() => expect(series()).toHaveLength(42));
    const chips = () => [...dialog.querySelectorAll<HTMLButtonElement>('.inventory-chart-sheet__chip')];
    expect(chips()).toHaveLength(8);
    const firstLabel = chips()[0].textContent;
    chips()[0].click(); fixture.detectChanges();
    expect(chips()[0].getAttribute('aria-pressed')).toBe('false');
    await vi.waitFor(() => expect(series()).toHaveLength(41));
    expect(dialog.querySelector('.v1-meter-results-chart__accessible-data')?.textContent).not.toContain(firstLabel?.trim());
    await page.getByRole('button', { name: 'Next legend page' }).click(); fixture.detectChanges();
    expect(chips()[0].textContent).not.toBe(firstLabel);
    component.chartView.update(view => ({ ...view, hiddenGuids: component.chartViews().find(item => item.id === 'energy')!.metrics.map(metric => metric.id) })); fixture.detectChanges();
    expect(dialog.textContent).toContain('No meters selected');
    component.chartView.update(view => ({ ...view, hiddenGuids: [] })); fixture.detectChanges();
    await page.getByRole('button', { name: 'Cost', exact: true }).click(); fixture.detectChanges();
    const costChart = () => echarts.getInstanceByDom(dialog.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!)!;
    await vi.waitFor(() => expect((costChart().getOption() as any).series).toHaveLength(64));
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); fixture.detectChanges();
    expect(component.zoomRange()).toEqual({ start: 20, end: 80 });
    await page.screenshot({ element: dialog, path: '../../../../../../../.angular/facility-meter-charts-sheet.png' });
    await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    await vi.waitFor(() => expect(host.querySelector('[role="dialog"]')).toBeNull());
    expect(document.activeElement).toBe(handle);
    await search.fill(''); fixture.detectChanges();
    expect(component.zoomRange()).toEqual({ start: 20, end: 80 });
    handle.click(); fixture.detectChanges();
    await vi.waitFor(() => expect(host.querySelector('[role="dialog"]')).not.toBeNull());
    expect(component.chartView().metric).toBe('cost');
    await page.getByRole('button', { name: 'Close charts', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelector('.inventory-chart-sheet--closing')).not.toBeNull();
    await vi.waitFor(() => expect(host.querySelector('[role="dialog"]')).toBeNull());
    const first = host.querySelector<HTMLAnchorElement>('.portfolio-inventory .portfolio-tile__name')!;
    first.focus(); await userEvent.keyboard('{Enter}'); expect(navigate).toHaveBeenCalled();
    const menuButton = host.querySelector<HTMLButtonElement>('.portfolio-inventory .portfolio-tile__menu-button')!;
    menuButton.click(); fixture.detectChanges();
    await page.getByRole('menuitemcheckbox', { name: 'Show details' }).click(); fixture.detectChanges();
    await vi.waitFor(() => expect(visibleCards()[0].getAttribute('data-detail')).toBe('detailed'));
    expect(document.activeElement).toBe(menuButton);
    menuButton.click(); fixture.detectChanges();
    await page.getByRole('menuitem', { name: 'Copy meter' }).click(); fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('Its readings will not be copied');
    await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    await page.getByRole('button', { name: 'Select meters', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelector('.facility-meters__selection')).not.toBeNull();
    expect(toolbar.querySelector('.facility-meters__select')).toBeNull();
    await page.getByRole('button', { name: 'Select all matching', exact: true }).click(); fixture.detectChanges();
    expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Delete selected', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelectorAll('[role="dialog"] li')).toHaveLength(64);
    await userEvent.keyboard('{Escape}'); fixture.detectChanges(); expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Cancel selection', exact: true }).click(); fixture.detectChanges();
    const scroll = host.querySelector('main')!; scroll.scrollTop = 400;
    await vi.waitFor(() => {
      const header = host.querySelector('.v1-facility-meters__header')!.getBoundingClientRect();
      expect(toolbar.getBoundingClientRect().top).toBeCloseTo(header.bottom, 0);
      expect(header.top).toBeCloseTo(scroll.getBoundingClientRect().top, 0);
    });
    expect(handle.getBoundingClientRect().bottom).toBeCloseTo(1000, 0);
    scroll.scrollTop = 0;
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      host.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      for (const status of host.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile__status')) {
        status.style.backgroundColor = getComputedStyle(status.closest('article')!).backgroundColor;
        expect(textContrast(status)).toBeGreaterThanOrEqual(4.5); status.style.backgroundColor = '';
      }
      expect(textContrast(handle)).toBeGreaterThanOrEqual(4.5);
    }
    host.className = 'v1-root';
    await page.viewport(390, 740); fixture.detectChanges();
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    handle.click(); fixture.detectChanges();
    await vi.waitFor(() => expect(host.querySelector('canvas')).not.toBeNull());
    const narrow = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth);
    await page.screenshot({ element: narrow, path: '../../../../../../../.angular/facility-meter-charts-narrow.png' });
    const media = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    await media.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    expect(getComputedStyle(narrow).animationName).toBe('none');
    await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    await media.send('Emulation.setEmulatedMedia', { media: 'print', features: [] });
    expect(getComputedStyle(host.querySelector('.inventory-chart-dock')!).display).toBe('none');
    expect(getComputedStyle(host.querySelector('.portfolio-inventory-print')!).display).toBe('grid');
    expect(host.querySelectorAll('.portfolio-inventory-print .portfolio-tile')).toHaveLength(64);
    await media.send('Emulation.setEmulatedMedia', { media: '' });
    meters.set(meters().slice(0, 1)); fixture.detectChanges();
    expect(visibleCards()).toHaveLength(1); expect(host.querySelector('.portfolio-pagination')).toBeNull();
    fixture.destroy(); await page.viewport(1600, 1000);
  });
});
