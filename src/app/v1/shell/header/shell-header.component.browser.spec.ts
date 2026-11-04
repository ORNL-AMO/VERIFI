import { cdp, page, userEvent } from 'vitest/browser';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { ShellHeaderTestModule } from './shell-header.testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { ShellHeaderComponent } from './shell-header.component';

describe('backup tooltip contrast', () => {
  it.each(['default', 'steel', 'blueprint', 'neon', 'aurora', 'forest'])('is readable in %s light/dark and high-contrast modes', palette => {
    TestBed.configureTestingModule({
      imports: [ShellHeaderTestModule],
      providers: [
        { provide: AppearanceService, useValue: {} },
        { provide: WorkspaceNavigationService, useValue: {
          isWorkspaceRoute: () => true, account: () => ({ guid: 'account-a', name: 'Account A' }),
          facilities: () => [], headerFacility: () => undefined, singleFacilityContext: () => undefined, isSingleSiteWorkspace: () => false, scopeChangePending: () => false, scopeAvailability: () => '', scopeNotice: () => '', contextNavigationError: () => '', dataCheckState: () => 'ready', activePanelTab: () => 'help', openTodos: vi.fn(), isSupportPanelOpen: () => false
        } },
        { provide: ManualBackupDownloadService, useValue: {
          available: signal(true), preparing: signal(false),
          reminder: signal({ tone: 'recommended', label: 'No backup recorded', detail: 'Backup recommended.' })
        } }
      ]
    });
    const fixture = TestBed.createComponent(ShellHeaderComponent);
    fixture.componentInstance.backupTooltipOpen = true;
    fixture.detectChanges();
    for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
      fixture.nativeElement.className = `v1-root v1-palette-${palette} ${mode}`;
      const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;
      const style = getComputedStyle(tooltip);
      expect(tooltip.hidden).toBe(false);
      const text = luminance(style.color);
      const background = luminance(style.backgroundColor);
      expect((Math.max(text, background) + .05) / (Math.min(text, background) + .05)).toBeGreaterThanOrEqual(4.5);
    }
    fixture.destroy();
  });
});

function luminance(color: string): number {
  const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

describe('header facility chooser presentation', () => {
  it('supports themed search, keyboard scope selection, long names, narrow windows and print', async () => {
    await page.viewport(1200, 800);
    const facility = { guid: 'facility-a', accountId: 'account-a', name: 'Manufacturing and Packaging Campus — ' + 'North '.repeat(12), city: 'Knoxville', state: 'TN' };
    const selected = signal<typeof facility | undefined>(undefined);
    const account = { guid: 'account-a', name: 'Industrial Portfolio ' + 'Division '.repeat(12) };
    const navigation = {
      isWorkspaceRoute: () => true, account: () => account, facilities: () => [facility], headerFacility: selected, singleFacilityContext: signal<typeof facility | undefined>(undefined),
      isSingleSiteWorkspace: () => false, scopeChangePending: () => false, scopeAvailability: () => '', scopeNotice: () => '', contextNavigationError: () => '',
      dataCheckState: () => 'ready', activePanelTab: () => 'help', openTodos: vi.fn(), isSupportPanelOpen: () => false, showWelcome: vi.fn(), toggleSupportPanel: vi.fn(),
      changeFacilityScope: vi.fn(scope => selected.set(scope.kind === 'facility' ? facility : undefined))
    };
    TestBed.configureTestingModule({ imports: [ShellHeaderTestModule], providers: [
      { provide: AppearanceService, useValue: {} }, { provide: WorkspaceNavigationService, useValue: navigation },
      { provide: ManualBackupDownloadService, useValue: { available: signal(true), preparing: signal(false), reminder: signal({ tone: 'recommended', label: 'Backup recommended', detail: '' }) } }
    ] });
    const fixture = TestBed.createComponent(ShellHeaderComponent); fixture.nativeElement.style.width = '100%';
    fixture.nativeElement.className = 'v1-root'; fixture.detectChanges();
    const toggle = () => fixture.nativeElement.querySelector('.v1-facility-picker__toggle') as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-link').title).toBe(account.name);
    await page.screenshot({ element: fixture.nativeElement.querySelector('header'), path: '../../../../../.angular/facility-scope/header-wide.png' });
    for (const palette of PORTFOLIO_PALETTES) {
      for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
        fixture.nativeElement.className = `v1-root v1-palette-${palette} ${mode}`;
        toggle().click(); fixture.detectChanges(); await fixture.whenStable();
        const menu = document.querySelector<HTMLElement>('.v1-facility-picker__menu')!;
        const item = menu.querySelector<HTMLElement>('.v1-facility-picker__all')!;
        expect(textContrast(item, menu)).toBeGreaterThanOrEqual(4.5);
        await userEvent.keyboard('{Escape}'); fixture.detectChanges();
        expect(document.activeElement).toBe(toggle());
      }
    }
    toggle().click(); fixture.detectChanges(); await fixture.whenStable();
    await page.getByRole('searchbox', { name: 'Search facilities' }).fill('knoxville'); fixture.detectChanges();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}'); fixture.detectChanges();
    expect(navigation.changeFacilityScope).toHaveBeenCalledWith({ kind: 'facility', facilityGuid: 'facility-a' });
    expect(toggle().title).toBe(facility.name);
    fixture.nativeElement.querySelector('.v1-workspace__account-link').click(); fixture.detectChanges();
    expect(navigation.changeFacilityScope).toHaveBeenLastCalledWith({ kind: 'all' });
    expect(navigation.showWelcome).not.toHaveBeenCalled();
    await page.viewport(480, 400);
    toggle().click(); fixture.detectChanges(); await fixture.whenStable();
    const menu = document.querySelector<HTMLElement>('.v1-facility-picker__menu')!;
    expect(menu.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
    expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(480);
    expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(400);
    expect(fixture.nativeElement.querySelector('header').scrollWidth).toBeLessThanOrEqual(480);
    await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    await page.screenshot({ element: fixture.nativeElement.querySelector('header'), path: '../../../../../.angular/facility-scope/header-narrow.png' });
    navigation.singleFacilityContext.set(facility); fixture.detectChanges();
    const identity = fixture.nativeElement.querySelector('.v1-workspace__single-identity') as HTMLElement;
    expect(identity.title).toBe(facility.name);
    expect(identity.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('header').scrollWidth).toBeLessThanOrEqual(480);
    navigation.singleFacilityContext.set(undefined); fixture.detectChanges();
    expect(toggle()).not.toBeNull();
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print' });
    try { expect(getComputedStyle(fixture.nativeElement.querySelector('app-facility-picker')).display).toBe('none'); }
    finally { await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '' }); fixture.destroy(); }
  });
});
