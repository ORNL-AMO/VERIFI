import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { InventoryDetailLevel, InventoryTile, InventoryTileDetailChange } from '../inventory.models';
import { InventoryGridComponent } from './inventory-grid.component';

function tile(index: number): InventoryTile {
  return { guid: `item-${index}`, name: `Item ${index}`, icon: 'facility', route: ['/items', String(index)],
    status: { tone: 'success', icon: 'success', label: 'All data valid' },
    facilitySnapshot: { evaluation: 'ready', resources: [], findings: [], remainingFindings: 0, address: 'Oak Ridge, TN' } };
}

@Component({ standalone: true, imports: [InventoryGridComponent], template: `
  <main class="v1-root" [style.width.px]="width()">
    <app-inventory-grid [tiles]="tiles()" [printTiles]="tiles()" [detail]="detail()" [overrides]="overrides()"
      (detailChanged)="setDetail($event)"/>
  </main>` })
class GridHost {
  readonly width = signal(1100);
  readonly detail = signal<InventoryDetailLevel>('simple');
  readonly overrides = signal<Readonly<Record<string, InventoryDetailLevel>>>({});
  readonly tiles = signal<readonly InventoryTile[]>(Array.from({ length: 6 }, (_, index) => tile(index)));
  setDetail(change: InventoryTileDetailChange): void { this.overrides.update(current => ({ ...current, [change.guid]: change.level })); }
}

function setup() {
  TestBed.configureTestingModule({ imports: [GridHost], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(GridHost); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const cards = () => [...root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile')];
  return { fixture, host: fixture.componentInstance, root, cards };
}

function minimumColumnWidth(detail: InventoryDetailLevel): number {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return detail === 'simple' ? Math.max(16 * rem, 240) : detail === 'summary' ? Math.max(20 * rem, 300) : Math.max(24 * rem, 360);
}

function expectOrderedRows(cards: readonly HTMLElement[]) {
  const bounds = cards.map(card => card.getBoundingClientRect());
  for (let index = 0; index < bounds.length; index++) {
    const current = bounds[index];
    expect(current.height).toBeGreaterThan(0);
    if (index) {
      const previous = bounds[index - 1];
      expect(current.top > previous.top + .5 || (Math.abs(current.top - previous.top) < .5 && current.left > previous.left)).toBe(true);
    }
    for (const other of bounds.slice(index + 1)) {
      if (Math.abs(other.top - current.top) < .5) expect(other.height).toBeCloseTo(current.height, 0);
      expect(other.left >= current.right - .5 || other.right <= current.left + .5 || other.top >= current.bottom - .5).toBe(true);
    }
  }
}

describe('CSS inventory rows', () => {
  it.each(['simple', 'summary', 'detailed'] as const)('uses the %s column minimum and keeps expanded cards inside their container', async detail => {
    await page.viewport(1800, 1000);
    const { fixture, host, root, cards } = setup();
    host.detail.set(detail);
    if (detail !== 'detailed') host.overrides.set({ 'item-0': 'detailed' });
    const minimum = minimumColumnWidth(detail);
    const threshold = minimum * 2 + 12;
    // Shrink the container with a wide card already present, keeping the viewport fixed.
    for (const width of [minimum * 3 + 24, threshold + 1, threshold, threshold - 1, 240]) {
      host.width.set(width); fixture.detectChanges(); await fixture.whenStable();
      const grid = root.querySelector<HTMLElement>('.portfolio-inventory')!;
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      expect(columns).toBe(width >= minimum * 3 + 24 ? 3 : width >= threshold ? 2 : 1);
      expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth + 1);
      expectOrderedRows(cards());
      if (detail !== 'detailed') {
        const wide = cards()[0].getBoundingClientRect(), normal = cards()[1].getBoundingClientRect();
        expect(wide.width).toBeCloseTo(columns > 1 ? normal.width * 2 + 12 : normal.width, 0);
      }
    }
    fixture.destroy();
  });

  it('stretches mixed-detail neighbors when content grows and keeps keyboard expansion focused', async () => {
    await page.viewport(1600, 1200);
    const { fixture, host, cards, root } = setup();
    const menu = cards()[0].querySelector<HTMLButtonElement>('.portfolio-tile__menu-button')!;
    menu.focus(); await userEvent.keyboard('{Enter}');
    await page.getByRole('menuitemcheckbox', { name: 'Show details', exact: true }).click();
    fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(menu);
    expect(cards()[0].getBoundingClientRect().width).toBeGreaterThan(cards()[1].getBoundingClientRect().width * 1.7);
    const previousHeight = cards()[0].getBoundingClientRect().height;
    host.tiles.update(tiles => tiles.map((entry, index) => index ? entry : { ...entry, facilitySnapshot: {
      ...entry.facilitySnapshot!, findings: [{ id: 'warning', name: 'Facility', title: 'Check configuration',
        severity: 'warning', description: 'Long saved configuration finding. '.repeat(50) }]
    } }));
    fixture.detectChanges(); await fixture.whenStable();
    expect(cards()[0].getBoundingClientRect().height).toBeGreaterThan(previousHeight);
    expectOrderedRows(cards());
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.portfolio-inventory .portfolio-tile__name')];
    for (const link of links) {
      link.focus(); await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(link.closest('article')!.querySelector('button'));
    }
    fixture.destroy();
  });

  it('honors rem minimums under larger text and keeps long cards readable in themed narrow layouts', async () => {
    await page.viewport(1600, 1200);
    const originalFont = document.documentElement.style.fontSize;
    const { fixture, host, root, cards } = setup();
    try {
      for (const size of ['10px', '32px']) {
        document.documentElement.style.fontSize = size;
        for (const detail of ['simple', 'summary', 'detailed'] as const) {
          host.detail.set(detail); host.overrides.set({ 'item-0': 'detailed' });
          const threshold = minimumColumnWidth(detail) * 2 + 12;
          for (const width of [threshold + 1, threshold - 1]) {
            host.width.set(width); fixture.detectChanges(); await fixture.whenStable();
            const first = cards()[0].getBoundingClientRect(), second = cards()[1].getBoundingClientRect();
            expect(getComputedStyle(root.querySelector('.portfolio-inventory')!).gridTemplateColumns.split(' ')).toHaveLength(width > threshold ? 2 : 1);
            expect(first.width).toBeCloseTo(width > threshold && detail !== 'detailed' ? second.width * 2 + 12 : second.width, 0);
            expectOrderedRows(cards());
          }
        }
      }
      host.width.set(320);
      host.tiles.update(entries => entries.map(entry => ({ ...entry, name: 'A very long inventory name '.repeat(10) })));
      for (const theme of ['', 'v1-theme-dark', 'v1-theme-dark v1-contrast-strong']) {
        root.querySelector('main')!.className = `v1-root ${theme}`;
        fixture.detectChanges(); await fixture.whenStable();
        expect(root.querySelector('.portfolio-inventory')!.scrollWidth).toBeLessThanOrEqual(321);
        expectOrderedRows(cards());
      }
    } finally { document.documentElement.style.fontSize = originalFont; fixture.destroy(); }
  });
});
