import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import type { StatusEvaluationState } from '@app/v1/status/status.models';
import { PORTFOLIO_PALETTES } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { StatusEvaluationMessageComponent } from './status-evaluation-message.component';

@Component({
  standalone: true,
  imports: [StatusEvaluationMessageComponent],
  styleUrls: ['../../../shell/section-nav/section-nav.component.css'],
  template: `
    <aside class="v1-nav" aria-label="Section navigation">
      <section class="v1-nav__group" aria-labelledby="sidebar-data-title">
        <span id="sidebar-data-title" class="v1-nav__label">Facility Data</span>
        <app-status-evaluation-message [state]="state()" [compact]="true"/>
        <a class="v1-nav__link" href="#meter-settings">Meter settings</a>
      </section>
    </aside>
  `
})
class SidebarStatusHost {
  readonly state = signal<StatusEvaluationState>('ready');
}

describe('compact sidebar status in Chromium', () => {
  it('keeps navigation still through brief and sustained checks and readable across narrow themes', async () => {
    await page.viewport(390, 844);
    TestBed.configureTestingModule({ imports: [SidebarStatusHost] });
    const fixture = TestBed.createComponent(SidebarStatusHost);
    const root = fixture.nativeElement as HTMLElement;
    root.className = 'v1-root';
    root.style.cssText = 'width:220px;height:360px';
    fixture.detectChanges();
    const sidebar = root.querySelector<HTMLElement>('.v1-nav')!;
    const link = root.querySelector<HTMLAnchorElement>('.v1-nav__link')!;
    const status = () => root.querySelector<HTMLElement>('[role="status"]')!;
    const changeState = (state: StatusEvaluationState) => {
      fixture.componentInstance.state.set(state);
      fixture.detectChanges();
    };
    const linkTop = link.getBoundingClientRect().top;
    const expectStableLink = () => expect(link.getBoundingClientRect().top).toBeCloseTo(linkTop, 4);
    const expectContained = () => {
      expect(sidebar.scrollWidth).toBeLessThanOrEqual(sidebar.clientWidth + 1);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    };

    try {
      expect(link.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(status().textContent?.trim()).toBe('');
      changeState('evaluating');
      expect(status().textContent?.trim()).toBe('');
      expectStableLink();
      changeState('ready');
      await fixture.whenStable();
      expect(status().textContent?.trim()).toBe('');
      expectStableLink();

      changeState('evaluating');
      expect(status().textContent?.trim()).toBe('');
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(status().textContent?.trim()).toBe('Checking data…');
      }, { timeout: 1500, interval: 20 });
      expectStableLink();
      expectContained();
      await page.screenshot({ element: root, path: '../../../../../../.angular/sidebar-status.png' });

      for (const palette of PORTFOLIO_PALETTES) {
        for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
          root.className = `v1-root v1-palette-${palette} ${mode}`;
          expect(status().textContent?.trim()).toBe('Checking data…');
          expectStableLink();
          expectContained();
        }
      }
      root.className = 'v1-root';
      changeState('ready');
      expect(status().textContent?.trim()).toBe('');
      expectStableLink();

      changeState('error');
      const error = root.querySelector<HTMLElement>('[role="alert"]')!;
      expect(error.textContent).toContain('Workspace status could not be evaluated.');
      expect(error.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(error.scrollHeight).toBeLessThanOrEqual(error.clientHeight + 1);
      expectContained();
    } finally {
      fixture.destroy();
      await page.viewport(1100, 850);
    }
  });
});
