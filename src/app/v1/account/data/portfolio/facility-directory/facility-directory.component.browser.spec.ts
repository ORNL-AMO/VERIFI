import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { makeFinding } from '@app/v1/status/status.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '../../account-data.module';
import { PORTFOLIO_PALETTES, textContrast } from '../portfolio-browser-test.helpers';
import { AccountPortfolioFacilitiesTabComponent } from '../account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';

// Exercise native layout, theme changes, keyboard navigation and a large portfolio.
describe('facilities portfolio directory in Chromium', () => {
  it('supports 64 facilities, search, keyboard navigation, themes and narrow layouts', async () => {
    await page.viewport(1280, 900);
    const cities = ['Oak Ridge', 'Chicago', 'Los Angeles', 'Seattle', 'New York', 'Houston', 'Denver', 'Boston'];
    const states = ['TN', 'IL', 'CA', 'WA', 'NY', 'TX', 'CO', 'MA'];
    const facilities = Array.from({ length: 64 }, (_, index) => ({
      guid: `facility-${index}`, accountId: 'account-a',
      name: `${cities[index % 8]} ${index % 3 ? 'Plant' : 'Manufacturing and Distribution Center'} ${String(index + 1).padStart(2, '0')}`,
      country: 'US', city: cities[index % 8], state: states[index % 8], classification: 'Manufacturing'
    } as IdbFacility));
    const findings = facilities.filter((_, index) => index % 3 !== 0).map((facility, index) => makeFinding('facility.meters.missing', index % 2 ? 'warning' : 'error', 'readiness', {
      kind: 'facility', guid: facility.guid, name: facility.name, facilityGuid: facility.guid, accountGuid: 'account-a'
    }));
    const facilitiesState = signal(facilities);
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), facilities: facilitiesState, meters: signal([]), meterData: signal([]),
        predictors: signal([]), predictorData: signal([]), facilityAnalyses: signal([]), facilityReports: signal([]), energyUseEquipment: signal([])
      } },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal(findings) } },
      { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: {
        accountSettingsRoute: (guid: string) => ['/v1/workspace/account', guid, 'settings/portfolio'],
        facilityDataRoute: (guid: string) => ['/v1', 'workspace', 'facility', guid, 'data', 'meters']
      } }
    ] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountPortfolioFacilitiesTabComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', 'v1-palette-steel');
    Object.assign(host.style, { width: '100%', maxWidth: '1100px', display: 'block', padding: '16px', margin: '0 auto', background: 'var(--v1-bg)' });
    fixture.detectChanges();
    // Match the routed portfolio ancestry used by the shared browse toolbar.
    host.querySelector('.facility-portfolio')!.classList.add('v1-account-portfolio');
    const tiles = host.querySelectorAll<HTMLButtonElement>('.facility-directory__entry');
    const error = host.querySelector<HTMLElement>('[data-tone="danger"]')!;
    const warning = host.querySelector<HTMLElement>('[data-tone="warning"]')!;
    const healthy = host.querySelector<HTMLElement>('[data-tone="success"]')!;
    expect(getComputedStyle(error).borderInlineStartColor).not.toBe(getComputedStyle(warning).borderInlineStartColor);
    expect(getComputedStyle(error).backgroundColor).not.toBe(getComputedStyle(healthy).backgroundColor);
    expect(getComputedStyle(warning).backgroundColor).not.toBe(getComputedStyle(healthy).backgroundColor);
    for (const entry of host.querySelectorAll<HTMLElement>('[data-tone="success"]')) {
      expect(getComputedStyle(entry).backgroundColor).toBe(getComputedStyle(healthy).backgroundColor);
    }
    for (const entry of [error, warning]) {
      expect(textContrast(entry.querySelector('.facility-directory__status')!)).toBeGreaterThanOrEqual(4.5);
    }
    for (const palette of PORTFOLIO_PALETTES) {
      for (const dark of [false, true]) {
        for (const highContrast of [false, true]) {
          host.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${highContrast ? ' v1-contrast-strong' : ''}`;
          for (const entry of [error, warning]) {
            expect(textContrast(entry.querySelector('.facility-directory__status')!), `${palette}, dark=${dark}, highContrast=${highContrast}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
    host.className = 'v1-root v1-palette-steel';
    // The directory fits more than two columns and adds more as its content area widens.
    expect(tiles[0].getBoundingClientRect().width).toBeLessThan(host.clientWidth * .36);
    expect(tiles).toHaveLength(64);
    const tile = tiles[0];
    tile.focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-15', 'data', 'meters']);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/directory.png' });
    await page.viewport(1800, 1000);
    host.style.maxWidth = '1600px';
    expect(tiles[0].getBoundingClientRect().width).toBeLessThan(host.clientWidth * .27);
    expect(tiles[0].scrollWidth).toBeLessThanOrEqual(tiles[0].clientWidth + 1);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/directory-wide.png' });
    host.classList.add('v1-theme-dark', 'v1-contrast-strong');
    expect(getComputedStyle(error).borderInlineStartColor).not.toBe(getComputedStyle(warning).borderInlineStartColor);
    for (const entry of [error, warning]) {
      expect(textContrast(entry.querySelector('.facility-directory__status')!)).toBeGreaterThanOrEqual(4.5);
    }
    await page.viewport(390, 740);
    host.style.maxWidth = '360px';
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
    expect(tile.scrollWidth).toBeLessThanOrEqual(tile.clientWidth + 1);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/directory-narrow.png' });
    fixture.componentInstance.filtersForm.controls.search.setValue('Seattle');
    fixture.detectChanges();
    expect(host.querySelectorAll('.facility-directory__entry')).toHaveLength(8);
    fixture.componentInstance.filtersForm.controls.search.setValue('no match');
    fixture.detectChanges();
    expect(host.textContent).toContain('No facilities match');
    fixture.componentInstance.clearFilters();
    facilitiesState.set(facilities.slice(0, 3));
    fixture.detectChanges();
    expect(host.querySelector('.facility-directory--single-column')).not.toBeNull();
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/small-portfolio-narrow.png' });
    host.classList.remove('v1-theme-dark', 'v1-contrast-strong');
    host.style.maxWidth = '1100px';
    await page.viewport(1280, 900);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/small-portfolio.png' });
    const row = host.querySelector('.facility-directory__entry') as HTMLElement;
    expect(row.getBoundingClientRect().width).toBeGreaterThan(host.clientWidth * .9);
    expect(row.getBoundingClientRect().height).toBeLessThan(100);
    const printSession = cdp() as { send(command: string, parameters: { media: string }): Promise<void> };
    await printSession.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      const printedRows = host.querySelectorAll<HTMLElement>('.facility-directory > li');
      expect(printedRows[0].getBoundingClientRect().left).toBeCloseTo(printedRows[1].getBoundingClientRect().left, 0);
      expect(getComputedStyle(host.querySelector('.facility-portfolio__toolbar')!).display).toBe('none');
    } finally {
      await printSession.send('Emulation.setEmulatedMedia', { media: '' });
    }
    fixture.destroy();
  });
});
