import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { PORTFOLIO_PALETTES, textContrast } from '../inventory-browser-test.helpers';
import { InventoryTileComponent } from './inventory-tile.component';
import { InventoryTile } from '../inventory.models';

@Component({ standalone: true, imports: [InventoryTileComponent], template: `
  <main class="v1-root" style="width:280px;padding:12px">
    <app-inventory-tile [tile]="facility"/>
    <app-inventory-tile [tile]="account"/>
    <app-inventory-tile [tile]="report"/>
    <app-inventory-tile [tile]="visualization"/>
  </main>` })
class HeaderHost {
  readonly facility: InventoryTile = { guid: 'meter', name: 'Electricity', icon: 'meter', route: ['/meter'],
    owner: { facilityGuid: 'facility-a', label: 'North manufacturing facility with a very long name', route: ['/north'] },
    status: { tone: 'success', icon: 'success', label: 'All data valid' } };
  readonly account: InventoryTile = { guid: 'analysis', name: 'Annual energy', icon: 'accountAnalysis', route: ['/analysis'],
    status: { tone: 'success', icon: 'success', label: 'All data valid' },
    analysisSnapshot: { scope: 'account', active: false, outcomes: [], facts: [], rosterTitle: '', roster: [], findings: [], modified: 'Today' } };
  readonly report: InventoryTile = { guid: 'report', name: 'Annual report', icon: 'report', route: ['/report'],
    status: { tone: 'success', icon: 'success', label: 'Setup valid' },
    reportSnapshot: { scope: 'account', typeLabel: 'Analysis', facts: [], scopeLabel: 'Portfolio', modified: 'Today', findings: [], contentPending: false } };
  readonly visualization: InventoryTile = { guid: 'visualization', name: 'Energy usage trend', icon: 'chartTimeSeries', route: ['/visualization'],
    status: { tone: 'success', icon: 'success', label: 'Setup valid' },
    visualizationSnapshot: { scope: 'account', dataSources: [{ label: 'Meters', icon: 'meter' }, { label: 'Predictors', icon: 'predictor' },
      { label: 'Energy Use', icon: 'energyUseGroup' }, { label: 'Analysis', icon: 'analysis' }], scopeLabel: 'Portfolio', chartLabel: 'Line', periodLabel: 'All saved history', modified: 'Today', issues: [] } };
}

describe('inventory ownership header presentation', () => {
  it('keeps long facility names clear of actions and readable across themes in narrow windows', async () => {
    await page.viewport(390, 900);
    TestBed.configureTestingModule({ imports: [HeaderHost], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeaderHost); fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const headers = [...root.querySelectorAll<HTMLElement>('app-inventory-card-header')];
    expect(headers[3].textContent?.trim()).toBe('Account visualization');
    expect(root.querySelector('[data-visualization-scope="account"] .portfolio-tile__location')).toBeNull();
    expect(root.querySelectorAll('[data-visualization-scope="account"] [aria-label="Data sources"] [role="img"]')).toHaveLength(4);
    expect(root.querySelector('[data-visualization-scope="account"] .portfolio-tile__chip')).toBeNull();
    const owner = headers[0].querySelector('a')!;
    const menu = root.querySelector<HTMLButtonElement>('.portfolio-tile__menu-button')!;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    expect(owner.getBoundingClientRect().right).toBeLessThan(menu.getBoundingClientRect().left);
    expect(owner.textContent).toBe(fixture.componentInstance.facility.owner!.label);
    // The inner curve follows both border widths, leaving no exposed card surface at the corner.
    for (const corners of ['', 'v1-corners-square']) {
      root.className = `v1-root ${corners}`;
      const cardStyle = getComputedStyle(headers[0].closest('article')!);
      const headerStyle = getComputedStyle(headers[0]);
      const outerRadius = parseFloat(cardStyle.borderTopLeftRadius);
      const [horizontal, vertical = horizontal] = headerStyle.borderTopLeftRadius.split(' ').map(parseFloat);
      expect(horizontal).toBe(Math.max(0, outerRadius - parseFloat(cardStyle.borderLeftWidth)));
      expect(vertical).toBe(Math.max(0, outerRadius - parseFloat(cardStyle.borderTopWidth)));
      expect(parseFloat(headerStyle.borderTopRightRadius)).toBe(Math.max(0, outerRadius - parseFloat(cardStyle.borderRightWidth)));
    }
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      for (const header of headers) expect(textContrast(header), `${palette}, dark=${dark}, contrast=${contrast}`).toBeGreaterThanOrEqual(4.5);
      expect(textContrast(owner, headers[0])).toBeGreaterThanOrEqual(4.5);
      expect(getComputedStyle(headers[0]).backgroundColor).not.toBe(getComputedStyle(headers[1]).backgroundColor);
      for (const property of ['backgroundColor', 'borderBottomColor', 'fontSize', 'fontWeight'] as const)
        expect(getComputedStyle(headers[3])[property]).toBe(getComputedStyle(headers[2])[property]);
    }
    root.className = 'v1-root';
    owner.focus(); await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(root.querySelector('.portfolio-tile__name'));
    menu.focus(); await userEvent.keyboard('{Enter}');
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    await userEvent.keyboard('{Escape}'); expect(document.activeElement).toBe(menu);
    menu.blur();
    await page.screenshot({ element: root, path: '../../../../../../.angular/inventory-ownership-headers.png' });
    fixture.destroy();
  });
});
