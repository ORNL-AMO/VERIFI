import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts/core';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { cdp, page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
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
  it('supports large inventories, shared filters/zoom, actions, selection, focus, themes, resizing and print', async () => {
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
      { provide: WorkspaceNavigationService, useValue: { accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'facilities'],
      accountDataRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio'], facilityMeterRoute: (guid: string, id: string, tab: string) => ['/v1', 'workspace', 'facility', guid, 'data', 'meters', id, tab] } }
    ] });
    TestBed.overrideComponent(MetersDashboardComponent, { set: { providers: [{ provide: MetersDashboardActionsService, useValue: actions }] } });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DashboardHost); fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
    const component = fixture.debugElement.query(By.directive(MetersDashboardComponent)).componentInstance as MetersDashboardComponent;
    await vi.waitFor(() => expect(host.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(3));
    const chartElement = host.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
    const renderedChart = echarts.getInstanceByDom(chartElement)!;
    const assertPlotWidth = () => {
      const first = renderedChart.convertToPixel({ xAxisIndex: 0 }, 0) as number;
      const last = renderedChart.convertToPixel({ xAxisIndex: 0 }, 35) as number;
      expect((last - first) / renderedChart.getWidth()).toBeGreaterThan(.8);
    };
    await vi.waitFor(assertPlotWidth);
    expect(host.querySelectorAll('.meter-directory__open')).toHaveLength(8);
    const columns = host.querySelector('.facility-meters__columns') as HTMLElement;
    expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(2);
    const directory = host.querySelector('.meter-directory')!;
    expect(getComputedStyle(directory).gridTemplateColumns.split(' ')).toHaveLength(2);
    const rows = directory.querySelectorAll('li');
    expect(rows[0].getBoundingClientRect().top).toBeCloseTo(rows[1].getBoundingClientRect().top, 0);
    expect(rows[2].getBoundingClientRect().top).toBeGreaterThanOrEqual(rows[0].getBoundingClientRect().bottom);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/facility-meter-dashboard-wide.png' });
    const firstPageGuids = component.visibleMeterCards().map(entry => entry.card.meter.guid);
    await page.getByRole('button', { name: 'Next meter page', exact: true }).click(); fixture.detectChanges();
    expect(component.currentPage()).toBe(2);
    expect(component.visibleMeterCards().every(entry => !firstPageGuids.includes(entry.card.meter.guid))).toBe(true);
    expect(component.chartViews().find(chart => chart.id === 'cost')!.metrics).toHaveLength(64);
    await page.getByRole('button', { name: 'Previous meter page', exact: true }).click(); fixture.detectChanges();
    await page.getByRole('button', { name: 'Expand list', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelectorAll('.meter-directory__open')).toHaveLength(64);
    expect(host.querySelector('app-monthly-trends')).toBeNull();
    expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(1);
    await page.getByRole('button', { name: 'Return to list and charts', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelectorAll('.meter-directory__open')).toHaveLength(8);
    expect(document.activeElement?.textContent).toContain('Expand list');
    const search = page.getByRole('searchbox', { name: 'Find meter, source, group, or status' });
    await search.fill('Electricity'); fixture.detectChanges();
    expect(component.filteredMeterCards().length).toBeLessThan(64);
    expect(component.chartViews().find(chart => chart.id === 'water')!.metrics).toHaveLength(0);
    const zoom = page.getByRole('button', { name: 'Zoom in', exact: true }); await zoom.click(); fixture.detectChanges();
    expect(component.zoomRange().end - component.zoomRange().start).toBe(60);
    await search.fill(''); fixture.detectChanges(); expect(component.zoomRange()).toEqual({ start: 0, end: 100 });
    const first = host.querySelector<HTMLButtonElement>('.meter-directory__open')!;
    expect(first.querySelector('strong .meter-directory__name-arrow')).not.toBeNull();
    await page.getByRole('button', { name: /^A very long meter name with factory wing/ }).hover();
    await vi.waitFor(() => expect(new DOMMatrix(getComputedStyle(first.querySelector('.meter-directory__name-arrow')!).transform).m41).toBeGreaterThan(0));
    const motion = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    await motion.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await vi.waitFor(() => expect(getComputedStyle(first.querySelector('.meter-directory__name-arrow')!).transform).toBe('none'));
    await motion.send('Emulation.setEmulatedMedia', { features: [] });
    first.focus(); await userEvent.keyboard('{Enter}'); expect(navigate).toHaveBeenCalled();
    await page.getByRole('button', { name: 'Select meters', exact: true }).click(); fixture.detectChanges();
    await page.getByRole('button', { name: 'Select all matching', exact: true }).click(); fixture.detectChanges();
    expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Delete selected', exact: true }).click(); fixture.detectChanges();
    expect(host.querySelectorAll('[role="dialog"] li')).toHaveLength(64);
    await userEvent.keyboard('{Escape}'); fixture.detectChanges(); expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Cancel selection', exact: true }).click(); fixture.detectChanges();
    const scroll = host.querySelector('main')!; scroll.scrollTop = 400;
    await vi.waitFor(() => expect(getComputedStyle(host.querySelector('.facility-meters__sticky')!).paddingBottom).toBe('0px'));
    await vi.waitFor(() => {
      const header = host.querySelector('.facility-meters__sticky')!.getBoundingClientRect();
      const toolbar = host.querySelector('.facility-meters__toolbar')!.getBoundingClientRect();
      expect(toolbar.top).toBeCloseTo(header.bottom, 0);
      expect(header.top).toBeCloseTo(scroll.getBoundingClientRect().top, 0);
    });
    scroll.scrollTop = 0;
    await vi.waitFor(() => expect(parseFloat(getComputedStyle(host.querySelector('.facility-meters__sticky')!).paddingBottom)).toBeGreaterThan(0));
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      host.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      for (const status of host.querySelectorAll<HTMLElement>('.meter-directory__status')) {
        // Healthy entries display only an icon; visible status text uses the text contrast threshold.
        const threshold = (status.closest('li') as HTMLElement).dataset.tone === 'success' ? 3 : 4.5;
        expect(textContrastOnRow(status), `${palette}, dark=${dark}, contrast=${contrast}, ${status.textContent}`).toBeGreaterThanOrEqual(threshold);
      }
      for (const button of host.querySelectorAll<HTMLElement>('.v1-facility-meters__header-actions .v1-btn')) expect(textContrast(button)).toBeGreaterThanOrEqual(4.5);
    }
    for (const dark of [false, true]) {
      host.className = `v1-root${dark ? ' v1-theme-dark' : ''}`;
      const chartElement = host.querySelector<HTMLElement>('[appv1echarts]') ?? host.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
      const chart = echarts.getInstanceByDom(chartElement)!;
      await vi.waitFor(() => expect((chart.getOption() as any).tooltip[0].textStyle.color).toBe(getComputedStyle(host).getPropertyValue('--v1-text').trim()));
      chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 1 });
      await vi.waitFor(() => expect(host.querySelector('.v1-chart-tooltip')).not.toBeNull());
      const tooltip = host.querySelector<HTMLElement>('.v1-chart-tooltip')!;
      expect(textContrast(tooltip)).toBeGreaterThanOrEqual(4.5);
      await vi.waitFor(() => expect(tooltip.querySelector('div')).not.toBeNull());
      expect(getComputedStyle(tooltip.querySelector('div')!).color).toBe(getComputedStyle(tooltip).color);
      chart.dispatchAction({ type: 'hideTip' });
    }
    host.className = 'v1-root';
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    await page.viewport(Math.ceil(66 * rem + 48), 900); fixture.detectChanges();
    await vi.waitFor(() => expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(2));
    await vi.waitFor(() => expect(getComputedStyle(directory).display).toBe('block'));
    await page.viewport(390, 740); fixture.detectChanges();
    await vi.waitFor(() => expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(1));
    expect(getComputedStyle(directory).display).toBe('block');
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    const narrowChart = echarts.getInstanceByDom(host.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!)!;
    await vi.waitFor(() => {
      const first = narrowChart.convertToPixel({ xAxisIndex: 0 }, 0) as number;
      const last = narrowChart.convertToPixel({ xAxisIndex: 0 }, 35) as number;
      expect((last - first) / narrowChart.getWidth()).toBeGreaterThan(.8);
    });
    await page.screenshot({ element: host, path: '../../../../../../../.angular/facility-meter-dashboard-narrow.png' });
    const client = cdp() as { send(command: string, parameters: { media: string }): Promise<void> }; await client.send('Emulation.setEmulatedMedia', { media: 'print' });
    expect(getComputedStyle(host.querySelector('.facility-meters__toolbar')!).display).toBe('none');
    await client.send('Emulation.setEmulatedMedia', { media: '' });
    // Also exercise a small inventory and explicit unavailable-chart states.
    const allMeters = meters();
    const smallMeters = allMeters.slice(0, 4);
    meters.set(smallMeters.slice(0, 1)); fixture.detectChanges(); expect(host.querySelectorAll('.meter-directory__open')).toHaveLength(1);
    expect(columns.classList.contains('facility-meters__columns--large')).toBe(false);
    expect(host.querySelector('[aria-label="Meter list display"]')).toBeNull();
    const lastRow = host.querySelector('.meter-directory li:last-child')!;
    expect(parseFloat(getComputedStyle(lastRow).borderBottomLeftRadius)).toBeGreaterThan(0);
    expect(parseFloat(getComputedStyle(lastRow).borderBottomRightRadius)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /^Actions for A very long meter name/ }).click();
    await vi.waitFor(() => {
      const menu = host.querySelector<HTMLElement>('.dropdown-menu.show')!;
      expect(menu).not.toBeNull();
      const rect = menu.getBoundingClientRect();
      expect(menu.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 10))).toBe(true);
    });
    await userEvent.keyboard('{Escape}');
    host.style.width = '56rem'; await page.viewport(1600, 1000);
    // Even a wide directory stays a simple list until there is a second page.
    for (const count of [8, 9, 4]) {
      meters.set(allMeters.slice(0, count)); fixture.detectChanges();
      await vi.waitFor(() => expect(getComputedStyle(directory).display).toBe(count > 8 ? 'grid' : 'block'));
      expect(Boolean(host.querySelector('[aria-label="Meter list display"]'))).toBe(count > 8);
      const visibleRows = directory.querySelectorAll('li');
      if (count > 8) {
        expect(getComputedStyle(directory).gridTemplateColumns.split(' ')).toHaveLength(2);
        expect(visibleRows[0].getBoundingClientRect().top).toBeCloseTo(visibleRows[1].getBoundingClientRect().top, 0);
        await search.fill('Meter 01'); fixture.detectChanges();
        expect(getComputedStyle(directory).display).toBe('block');
        expect(host.querySelector('[aria-label="Meter list display"]')).toBeNull();
        await search.fill(''); fixture.detectChanges();
        expect(getComputedStyle(directory).display).toBe('grid');
      } else {
        expect(visibleRows[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(visibleRows[0].getBoundingClientRect().bottom);
        const last = visibleRows[visibleRows.length - 1];
        expect(parseFloat(getComputedStyle(last).borderBottomLeftRadius)).toBeGreaterThan(0);
        expect(parseFloat(getComputedStyle(last).borderBottomRightRadius)).toBeGreaterThan(0);
      }
    }
    fixture.destroy(); await page.viewport(1600, 1000);
  });
});

function textContrastOnRow(status: HTMLElement): number {
  const color = getComputedStyle(status).color;
  const own = getComputedStyle(status).backgroundColor;
  const background = own === 'rgba(0, 0, 0, 0)' || own === 'transparent' ? getComputedStyle(status.closest('li')!).backgroundColor : own;
  const probe = document.createElement('span'); probe.style.color = color; probe.style.backgroundColor = background;
  document.body.append(probe); const contrast = textContrast(probe); probe.remove(); return contrast;
}
