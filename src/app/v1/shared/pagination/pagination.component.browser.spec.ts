import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cdp, page, userEvent } from 'vitest/browser';
import { PORTFOLIO_PALETTES, textContrast } from '../inventory/inventory-browser-test.helpers';
import { PaginationComponent } from './pagination.component';

@Component({ standalone: true, imports: [PaginationComponent], template: `
  <main class="v1-root" style="padding: 16px; background: var(--v1-surface); color: var(--v1-text)">
    <button type="button">Before pagination</button>
    <app-pagination [collectionSize]="total()" [pageSize]="size()" [page]="current()" [disabled]="disabled()"
      ariaLabel="Meter readings pages" (pageChange)="current.set($event)"/>
    <button type="button">After pagination</button>
  </main>` })
class PaginationHost {
  readonly total = signal(132);
  readonly size = signal(12);
  readonly current = signal(1);
  readonly disabled = signal(false);
}

// Keep the Chromium command contract local: importing Playwright's full types also loads Electron's incompatible Node declarations.
function emulateMedia(media: '' | 'print'): Promise<void> {
  const session = cdp() as { send(method: 'Emulation.setEmulatedMedia', params: { media: string }): Promise<void> };
  return session.send('Emulation.setEmulatedMedia', { media });
}

function setup() {
  TestBed.configureTestingModule({ imports: [PaginationHost] });
  const fixture = TestBed.createComponent(PaginationHost); fixture.detectChanges();
  const root = fixture.nativeElement.querySelector('main') as HTMLElement;
  const button = (label: string) => root.querySelector<HTMLButtonElement>(`app-pagination button[aria-label="${label}"]`)!;
  return { fixture, host: fixture.componentInstance, root, button };
}

describe('Themed pagination in Chromium', () => {
  it('supports keyboard navigation, stable focus through batches, current-page semantics, and live announcements', async () => {
    const { fixture, host, root, button } = setup();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Meter readings pages');
    (root.querySelector('button') as HTMLButtonElement).focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(button('Page 1')); // Disabled Previous is skipped.
    await userEvent.keyboard('{Tab}{Enter}'); fixture.detectChanges(); await fixture.whenStable();
    expect(host.current()).toBe(2);
    expect(button('Page 2').getAttribute('aria-current')).toBe('page');
    expect(root.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    const status = root.querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toBe('Page 2 of 11');
    expect(status.classList.contains('visually-hidden')).toBe(true);
    expect(getComputedStyle(status).position).toBe('absolute');
    expect(status.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(status.getBoundingClientRect().height).toBeLessThanOrEqual(1);
    host.current.set(5); fixture.detectChanges();
    const next = button('Next page'); next.focus();
    await userEvent.keyboard(' '); fixture.detectChanges(); await fixture.whenStable();
    expect(host.current()).toBe(6);
    expect(document.activeElement).toBe(next);
    expect(root.querySelector('.pagination__pages')?.textContent?.replace(/\s/g, '')).toBe('678910');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(button('Page 10'));
    await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    expect(host.current()).toBe(10);
    host.disabled.set(true); fixture.detectChanges();
    expect([...root.querySelectorAll<HTMLButtonElement>('app-pagination button')].every(control => control.disabled)).toBe(true);
    fixture.destroy();
  });

  it('keeps normal, selected, hovered, focused, and disabled controls legible in every palette and mode', async () => {
    const { fixture, host, root, button } = setup();
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      host.disabled.set(false); fixture.detectChanges();
      const context = `${palette}, dark=${dark}, high contrast=${contrast}`;
      for (const label of ['Page 1', 'Page 2', 'Previous page', 'Next page']) {
        expect(textContrast(button(label)), `${context}: ${label}`).toBeGreaterThanOrEqual(4.5);
      }
      await page.getByRole('button', { name: 'Page 2', exact: true }).hover();
      expect(textContrast(button('Page 2')), `${context}: hover`).toBeGreaterThanOrEqual(4.5);
      button('Page 2').focus(); await userEvent.keyboard('{Tab}');
      const focused = button('Page 3');
      expect(document.activeElement).toBe(focused);
      expect(getComputedStyle(focused).outlineStyle).toBe('solid');
      expect(parseFloat(getComputedStyle(focused).outlineWidth)).toBeGreaterThanOrEqual(2);
      expect(textContrast(focused), `${context}: focus`).toBeGreaterThanOrEqual(4.5);
      host.disabled.set(true); fixture.detectChanges();
      for (const control of root.querySelectorAll<HTMLButtonElement>('app-pagination button')) {
        expect(textContrast(control), `${context}: disabled`).toBeGreaterThanOrEqual(4.5);
      }
    }
    host.disabled.set(false); fixture.detectChanges();
    await page.screenshot({ element: root, path: '../../../../../.angular/pagination-dark-contrast.png' });
    fixture.destroy();
  });

  it('wraps at narrow widths, enlarges with text/control sizing, and disappears for print', async () => {
    const { fixture, host, root } = setup();
    const originalFont = document.documentElement.style.fontSize;
    try {
      host.total.set(999999999999); host.current.set(83333333330); fixture.detectChanges();
      for (const width of [320, 390, 1200]) {
        await page.viewport(width, 900);
        for (const font of ['16px', '32px']) {
          document.documentElement.style.fontSize = font;
          for (const controlHeight of ['1.75rem', '2rem', '2.5rem']) {
            root.style.setProperty('--v1-control-height-sm', controlHeight);
            expect(root.scrollWidth, `${width}, ${font}, ${controlHeight}`).toBeLessThanOrEqual(root.clientWidth + 1);
            const pager = root.querySelector<HTMLElement>('app-pagination')!;
            expect(pager.scrollWidth).toBeLessThanOrEqual(pager.clientWidth + 1);
            expect(root.querySelector('button[aria-label="Page 83333333330"]')!.getBoundingClientRect().height)
              .toBeGreaterThanOrEqual(parseFloat(font) * parseFloat(controlHeight));
          }
        }
        if (width < 480) {
          expect(getComputedStyle(root.querySelector('.pagination__direction-label')!).display).toBe('none');
        }
      }
      await page.viewport(320, 900); document.documentElement.style.fontSize = '16px';
      host.total.set(132); host.current.set(6); fixture.detectChanges();
      await page.screenshot({ element: root, path: '../../../../../.angular/pagination-320.png' });
      await emulateMedia('print');
      expect(getComputedStyle(root.querySelector('app-pagination')!).display).toBe('none');
    } finally {
      await emulateMedia('');
      document.documentElement.style.fontSize = originalFont;
      await page.viewport(1200, 900);
      fixture.destroy();
    }
  });
});
