import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '../account-data.module';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { PORTFOLIO_PALETTES, textContrast } from './portfolio-browser-test.helpers';

// Exercise native ResizeObserver and the same scroll ancestry as the routed browse tabs.
describe('portfolio sticky browse layout', () => {
  it('keeps the header and toolbar connected while scrolling and updates the offset after resizing', async () => {
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        provideRouter([]),
        { provide: WorkspaceNavigationService, useValue: { activePortfolioTab: signal('facilities') } },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
        { provide: AccountWorkspaceStore, useValue: {
          account: signal({ guid: 'account-a', name: 'A very long account name with unusual lengths '.repeat(8) }), facilities: signal([{ guid: 'facility-a' }]),
          meters: signal([]), predictors: signal([]), energyUseEquipment: signal([]),
          accountAnalyses: signal([]), facilityAnalyses: signal([]), facilityReports: signal([]),
          canWrite: signal(true), hasPending: signal(false)
        } }
      ]
    });
    const fixture = TestBed.createComponent(AccountPortfolioComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root');
    Object.assign(host.style, { width: '900px', height: '500px', overflow: 'auto' });
    fixture.detectChanges();
    const eyebrow = host.querySelector<HTMLElement>('header .v1-eyebrow')!;
    expect(eyebrow.scrollWidth).toBeGreaterThan(eyebrow.clientWidth);
    expect(getComputedStyle(eyebrow).textOverflow).toBe('ellipsis');
    expect(eyebrow.title).toBe(eyebrow.textContent);
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    const actions = [...host.querySelectorAll<HTMLElement>('.v1-account-portfolio__header-actions .v1-btn')];
    expect(actions).toHaveLength(3);
    const typography = actions.map(action => {
      const style = getComputedStyle(action);
      return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
    });
    expect(typography[1]).toEqual(typography[0]);
    expect(typography[2]).toEqual(typography[0]);
    for (const palette of PORTFOLIO_PALETTES) {
      for (const dark of [false, true]) {
        for (const highContrast of [false, true]) {
          host.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${highContrast ? ' v1-contrast-strong' : ''}`;
          for (const action of actions) {
            expect(textContrast(action), `${action.textContent}, ${palette}, dark=${dark}, highContrast=${highContrast}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
    host.className = 'v1-root';
    await page.screenshot({ element: host.querySelector('header')!, path: '../../../../../../.angular/portfolio-spike/header-actions.png' });
    const content = document.createElement('section');
    // A simple routed-toolbar probe avoids unrelated resource services and calculations.
    content.innerHTML = '<form class="v1-data-browse-toolbar">Search controls</form><div style="height:1400px"></div>';
    host.querySelector('.v1-account-portfolio')!.append(content);
    const sticky = host.querySelector('.v1-account-portfolio__sticky') as HTMLElement;
    const toolbar = content.querySelector('form')!;
    await vi.waitFor(() => expect(parseFloat(host.querySelector<HTMLElement>('.v1-account-portfolio')!.style.getPropertyValue('--portfolio-sticky-height')))
      .toBeCloseTo(sticky.getBoundingClientRect().height, 0));
    expect(parseFloat(getComputedStyle(sticky).paddingBottom)).toBeGreaterThan(0);
    host.scrollTop = 350;
    await vi.waitFor(() => {
      expect(getComputedStyle(sticky).paddingBottom).toBe('0px');
      expect(host.querySelector('header')!.getBoundingClientRect().bottom).toBeCloseTo(toolbar.getBoundingClientRect().top, 0);
      expect(sticky.getBoundingClientRect().top).toBeCloseTo(host.getBoundingClientRect().top, 0);
      expect(toolbar.getBoundingClientRect().top).toBeCloseTo(sticky.getBoundingClientRect().bottom, 0);
    });
    host.scrollTop = 0;
    await vi.waitFor(() => expect(parseFloat(getComputedStyle(sticky).paddingBottom)).toBeGreaterThan(0));
    sticky.style.paddingBottom = '45px';
    await vi.waitFor(() => {
      expect(parseFloat(host.querySelector<HTMLElement>('.v1-account-portfolio')!.style.getPropertyValue('--portfolio-sticky-height'))).toBeCloseTo(sticky.getBoundingClientRect().height, 0);
      expect(toolbar.getBoundingClientRect().top).toBeCloseTo(sticky.getBoundingClientRect().bottom, 0);
    });
  });
});
