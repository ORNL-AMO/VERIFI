import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppearanceService } from '../../appearance/appearance.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { ShellHeaderComponent } from './shell-header.component';

describe('ShellHeaderComponent', () => {
  it('shows brand and appearance controls on the welcome screen', () => {
    const { fixture } = setup(false);

    expect(fixture.nativeElement.querySelector('.v1-workspace__brand')?.textContent).toContain('VERIFI');
    expect(fixture.nativeElement.querySelector('.v1-workspace__account-menu')).toBeNull();
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
    expect(menuText).toContain('Topographic contours');
  });

  it('shows the account dropdown and support panel control on workspace routes', () => {
    const { fixture, navigation } = setup(true);

    expect(fixture.nativeElement.querySelector('.v1-account-switcher__button')?.textContent).toContain('Account A');
    expect(fixture.nativeElement.querySelector('select[aria-label="Select facility"]')).toBeNull();

    const accountButton: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-account-switcher__button');
    accountButton.click();
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('.v1-account-switcher__dropdown');
    expect(menu?.textContent).toContain('Account A');
    expect(menu?.textContent).toContain('Single facility');
    expect(menu?.textContent).toContain('Account B');
    expect(menu?.textContent).toContain('Portfolio');
    expect(menu?.textContent).toContain('Add new account');
    expect(menu?.textContent).toContain('Import backup');
    expect(menu?.textContent).toContain('Manage accounts');
    expect(menu.querySelectorAll('button:disabled').length).toBe(3);

    const accountItems: Array<HTMLButtonElement> = Array.from(menu.querySelectorAll('.v1-account-switcher__item:not(:disabled)'));
    expect(accountItems[0].classList.contains('active')).toBe(true);
    accountItems[1].click();
    fixture.detectChanges();

    expect(navigation.openWorkspace).toHaveBeenCalledWith('account-b');
    expect(fixture.componentInstance.accountMenuOpen).toBe(false);

    const panelButton: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Toggle support panel"]');
    panelButton.click();

    expect(navigation.toggleSupportPanel).toHaveBeenCalled();
  });

  it('closes open header menus from the backdrop and Escape key', () => {
    const { fixture } = setup(true);
    const accountButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.v1-account-switcher__button');

    accountButton().click();
    fixture.detectChanges();

    const backdrop: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-workspace__backdrop');
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.accountMenuOpen).toBe(false);

    accountButton().click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.accountMenuOpen).toBe(false);
  });
});

function setup(isWorkspaceRoute: boolean): {
  fixture: ComponentFixture<ShellHeaderComponent>;
  navigation: any;
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
    isWorkspaceRoute: vi.fn(() => isWorkspaceRoute),
    isSupportPanelOpen: vi.fn(() => true),
    contextMode: vi.fn(() => 'account'),
    account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
    accountOptions: vi.fn(() => [
      { guid: 'account-a', name: 'Account A', descriptor: 'Single facility', active: true },
      { guid: 'account-b', name: 'Account B', descriptor: 'Portfolio', active: false }
    ]),
    facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
    showWelcome: vi.fn(),
    openWorkspace: vi.fn(),
    setContext: vi.fn(),
    setFacility: vi.fn(),
    toggleSupportPanel: vi.fn()
  };

  TestBed.configureTestingModule({
    imports: [CommonModule],
    declarations: [ShellHeaderComponent],
    providers: [
      { provide: AppearanceService, useValue: appearance },
      { provide: WorkspaceNavigationService, useValue: navigation }
    ]
  });
  const fixture = TestBed.createComponent(ShellHeaderComponent);
  fixture.detectChanges();
  return { fixture, navigation };
}
