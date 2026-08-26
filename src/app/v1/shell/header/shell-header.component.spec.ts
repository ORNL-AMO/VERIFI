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
    expect(fixture.nativeElement.querySelector('.v1-workspace__context')).toBeNull();
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

  it('shows workspace context and support panel control on workspace routes', () => {
    const { fixture, navigation } = setup(true);

    expect(fixture.nativeElement.querySelector('.v1-workspace__context')?.textContent).toContain('Account A');
    expect(fixture.nativeElement.querySelector('.v1-workspace__context')?.textContent).toContain('Facility A');
    expect(fixture.nativeElement.querySelector('.v1-context-pill--active')).not.toBeNull();

    const panelButton: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Toggle support panel"]');
    panelButton.click();

    expect(navigation.toggleSupportPanel).toHaveBeenCalled();
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
    facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
    showWelcome: vi.fn(),
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
