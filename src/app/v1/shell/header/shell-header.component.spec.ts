import { IdbFacility } from '@data/models/idbModels/facility';
import { facility } from '@app/v1/data/meters/facility-meters.testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { ReactiveFormsModule } from '@angular/forms';
import { ShellHeaderTestModule } from './shell-header.testing';
import { signal } from '@angular/core';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { ShellHeaderComponent } from './shell-header.component';

describe('ShellHeaderComponent', () => {
  it('shows one static facility identity and restores account scope controls after conversion', () => {
    const { fixture, navigation } = setup(true);
    navigation.singleFacilityContext.set(facility({ name: 'Plant identity' })); fixture.detectChanges();
    const identity = fixture.nativeElement.querySelector('.v1-workspace__single-identity');
    expect(identity.textContent).toContain('Plant identity');
    expect(identity.querySelector('app-ui-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-header-backup')).not.toBeNull();
    fixture.nativeElement.querySelector('.v1-workspace__brand').click(); expect(navigation.showWelcome).toHaveBeenCalledOnce();
    navigation.singleFacilityContext.set(undefined); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-facility-picker')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-link').textContent).toContain('Account A');
  });

  it('opens To-dos from a failed check without changing the independent panel toggle', () => {
    const { fixture, navigation } = setup(true);
    navigation.dataCheckState.set('error');
    navigation.activePanelTab.set('help'); fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Data checks unavailable. Open To-dos"]').click();
    expect(navigation.openTodos).toHaveBeenCalledOnce();
    expect(navigation.toggleSupportPanel).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator [role=status]').textContent).toContain('unavailable');
    navigation.activePanelTab.set('todos'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator [role=status]').textContent).toBe('');
    navigation.isSupportPanelOpen.set(false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator [role=status]').textContent).toContain('unavailable');
    navigation.isWorkspaceRoute.set(false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator')).toBeNull();
  });

  it('cancels the indicator delay on route exit and starts fresh when returning', async () => {
    vi.useFakeTimers();
    const { fixture, navigation } = setup(true);
    navigation.dataCheckState.set('evaluating'); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(700);
    navigation.isWorkspaceRoute.set(false); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    navigation.isWorkspaceRoute.set(true); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(999); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator button')).toBeNull();
    await vi.advanceTimersByTimeAsync(1); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workspace-check-indicator button')).not.toBeNull();
    fixture.destroy(); vi.useRealTimers();
  });

  it('downloads the whole account immediately, including in facility context', () => {
    const { fixture, backups, navigation } = setup(true);
    navigation.contextMode.mockReturnValue('facility');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-header-backup__button');
    button.click();
    expect(backups.download).toHaveBeenCalledWith({ scope: 'account', accountGuid: 'account-a', format: 'json' });
    button.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=tooltip]').hidden).toBe(false);
    expect(button.getAttribute('aria-label')).toContain('Account A');
    expect(button.getAttribute('aria-label')).toContain('Backup recommended');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=tooltip]').hidden).toBe(true);
    backups.preparing.set(true);
    backups.available.set(false);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Preparing');
    button.click();
    expect(backups.download).toHaveBeenCalledTimes(1);
  });

  it('shows brand and appearance controls on the welcome screen', () => {
    const { fixture, appearance } = setup(false);

    expect(fixture.nativeElement.querySelector('.v1-workspace__brand')?.textContent).toContain('VERIFI');
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-menu')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-header-backup')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Toggle support panel"]')).toBeNull();

    const settingsButton: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Appearance settings"]');
    settingsButton.click();
    fixture.detectChanges();

    const menuText = fixture.nativeElement.querySelector('.v1-settings__menu')?.textContent;
    expect(menuText).toContain('Forest');
    expect(menuText).toContain('Neon');
    expect(menuText).toContain('Aurora');
    expect(menuText).toContain('High contrast');
    expect(menuText).toContain('Background');
    expect(menuText).toContain('Skyline rocket');
    expect(menuText).toContain('Night skyline rocket');
    expect(menuText).toContain('Green skyline');
    expect(menuText).toContain('Neon skyline');
    expect(menuText).toContain('Aurora skyline');
    expect(menuText).toContain('Blueprint skyline');
    expect(menuText).toContain('Steel skyline');
    expect(menuText).toContain('Blueprint grid');
    expect(menuText).toContain('Machined hatch');
    expect(menuText).toContain('Topographic contours');

    const backgroundSelect: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Background pattern"]');
    backgroundSelect.value = 'skyline-rocket-night';
    backgroundSelect.dispatchEvent(new Event('change'));

    expect(appearance.setBackgroundPattern).toHaveBeenCalledWith('skyline-rocket-night');
  });

  it('shows an account scope reset and a facility chooser without account switching', () => {
    const { fixture, navigation } = setup(true);
    expect(fixture.nativeElement.querySelector('.v1-account-switcher__button')).toBeNull();
    const home = fixture.nativeElement.querySelector('.v1-workspace__account-link') as HTMLButtonElement;
    expect(home.textContent).toContain('Account A');
    home.click();
    expect(navigation.changeFacilityScope).toHaveBeenCalledWith({ kind: 'all' });
    expect(navigation.showWelcome).not.toHaveBeenCalled();
    expect(home.querySelector('app-ui-icon')?.getAttribute('name')).toBe('account');
    const picker = fixture.nativeElement.querySelector('.v1-facility-picker__toggle') as HTMLButtonElement;
    expect(picker.textContent).toContain('All facilities');
    picker.click(); fixture.detectChanges();
    document.querySelector<HTMLButtonElement>('.v1-facility-picker__list button')!.click(); fixture.detectChanges();
    expect(navigation.changeFacilityScope).toHaveBeenCalledWith({ kind: 'facility', facilityGuid: 'facility-a' });
    fixture.nativeElement.querySelector('[aria-label="Toggle support panel"]').click();
    expect(navigation.toggleSupportPanel).toHaveBeenCalled();
  });

  it('keeps only one header popover open and dismisses appearance settings on Escape', () => {
    const { fixture } = setup(true);
    const settings = fixture.nativeElement.querySelector('[aria-label="Appearance settings"]') as HTMLButtonElement;
    settings.click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.v1-facility-picker__toggle').click(); fixture.detectChanges();
    expect(fixture.componentInstance.isSettingsOpen).toBe(false);
    settings.click(); fixture.detectChanges();
    expect(document.querySelector('.v1-facility-picker__menu')).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
    expect(fixture.componentInstance.isSettingsOpen).toBe(false);
  });

});

function setup(isWorkspaceRoute: boolean): {
  fixture: ComponentFixture<ShellHeaderComponent>;
  appearance: any;
  navigation: any;
  backups: any;
} {
  const appearance = {
    settings: vi.fn(() => ({
      palette: 'default',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'blueprint-grid'
    })),
    isDark: vi.fn(() => false),
    setPalette: vi.fn(),
    toggleMode: vi.fn(),
    toggleHighContrast: vi.fn(),
    setBackgroundPattern: vi.fn(),
    setCornerStyle: vi.fn()
  };
  const navigation = {
    isWorkspaceRoute: signal(isWorkspaceRoute),
    supportPanelRequested: () => false, dataCheckState: signal('ready'), activePanelTab: signal('help'), openTodos: vi.fn(), isSupportPanelOpen: signal(true),
    contextMode: vi.fn(() => 'account'),
    account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
    headerFacility: () => undefined, singleFacilityContext: signal<IdbFacility | undefined>(undefined), isSingleSiteWorkspace: () => false,
    scopeChangePending: () => false, scopeAvailability: () => '', scopeNotice: () => '', contextNavigationError: () => '',
    changeFacilityScope: vi.fn(),
    facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
    showWelcome: vi.fn(),
    openWorkspace: vi.fn(),
    setContext: vi.fn(),
    setFacility: vi.fn(),
    toggleSupportPanel: vi.fn()
  };

  const backups = {
    available: signal(true), preparing: signal(false),
    reminder: signal({ tone: 'recommended', label: 'No backup recorded', detail: 'Backup recommended.' }),
    download: vi.fn(async () => undefined)
  };
  TestBed.configureTestingModule({
    imports: [ShellHeaderTestModule, OverlayModule, ReactiveFormsModule, CommonModule, IconComponent],
    providers: [
      { provide: ManualBackupDownloadService, useValue: backups },
      { provide: AppearanceService, useValue: appearance },
      { provide: WorkspaceNavigationService, useValue: navigation }
    ]
  });
  const fixture = TestBed.createComponent(ShellHeaderComponent);
  fixture.detectChanges();
  return { fixture, appearance, navigation, backups };
}
