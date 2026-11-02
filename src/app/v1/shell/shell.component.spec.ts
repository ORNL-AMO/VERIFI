import { OverlayModule } from '@angular/cdk/overlay';
import { ReactiveFormsModule } from '@angular/forms';
import { ShellHeaderTestModule } from './header/shell-header.testing';
import { CommonModule } from '@angular/common';
import { ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { Component, NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { ShellHeaderComponent } from './header/shell-header.component';
import { ShellComponent } from './shell.component';
import { WorkspaceNavigationService } from './workspace-navigation.service';
import { ModalPortalService } from './modal-portal.service';

@Component({ standalone: true, template: '<button>Chart control</button>' })
class OverlayContent {}

@NgModule({
  imports: [ShellHeaderTestModule, OverlayModule, ReactiveFormsModule, CommonModule, IconComponent, NoopAnimationsModule, PortalModule, RouterModule.forRoot([])],
  declarations: [ShellComponent]
})
class ShellTestModule { }

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let appearance: {
    settings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    appearance = {
      settings: vi.fn(() => ({
        palette: 'neon',
        mode: 'dark',
        cornerStyle: 'square',
        highContrast: true,
        backgroundPattern: 'skyline-rocket'
      }))
    };
    TestBed.configureTestingModule({
      imports: [ShellTestModule],
      providers: [
        { provide: ManualBackupDownloadService, useValue: {} },
        { provide: AppearanceService, useValue: appearance },
        { provide: WorkspaceNavigationService, useValue: createNavigation() }
      ]
    });
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  it('applies the selected v1 appearance classes to the route root', () => {
    const root = fixture.nativeElement.querySelector('.v1-root');

    expect(root.classList.contains('v1-theme-dark')).toBe(true);
    expect(root.classList.contains('v1-palette-neon')).toBe(true);
    expect(root.classList.contains('v1-background-skyline-rocket')).toBe(true);
    expect(root.classList.contains('v1-contrast-strong')).toBe(true);
    expect(root.classList.contains('v1-corners-square')).toBe(true);
  });

  it('applies each themed skyline background class', () => {
    appearance.settings.mockReturnValue({
      palette: 'forest',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-green'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-root').classList.contains('v1-background-skyline-green')).toBe(true);

    appearance.settings.mockReturnValue({
      palette: 'neon',
      mode: 'dark',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-neon'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.v1-root');
    expect(root.classList.contains('v1-background-skyline-neon')).toBe(true);
    expect(root.classList.contains('v1-background-skyline-green')).toBe(false);

    appearance.settings.mockReturnValue({
      palette: 'blueprint',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-blueprint'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-root').classList.contains('v1-background-skyline-blueprint')).toBe(true);

    appearance.settings.mockReturnValue({
      palette: 'steel',
      mode: 'dark',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-steel'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-root').classList.contains('v1-background-skyline-steel')).toBe(true);

    appearance.settings.mockReturnValue({
      palette: 'aurora',
      mode: 'dark',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-aurora'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-root').classList.contains('v1-background-skyline-aurora')).toBe(true);

    appearance.settings.mockReturnValue({
      palette: 'default',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-rocket-night'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-root').classList.contains('v1-background-skyline-rocket-night')).toBe(true);
  });

  it('hosts the shared shell header above routed content', () => {
    expect(fixture.nativeElement.querySelector('app-shell-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-route-stage router-outlet')).not.toBeNull();
  });

  it('blocks routed content while leaving the header available, then unblocks on portal replacement or dismissal', () => {
    const portal = TestBed.inject(ModalPortalService);
    portal.show(new ComponentPortal(OverlayContent), { blockWorkspace: true }); fixture.detectChanges();
    const stage = fixture.nativeElement.querySelector('.v1-route-stage'), header = fixture.nativeElement.querySelector('app-shell-header');
    expect(stage.hasAttribute('inert')).toBe(true); expect(stage.classList.contains('v1-route-stage--blocked')).toBe(true);
    expect(header.closest('[inert]')).toBeNull();
    portal.show(new ComponentPortal(OverlayContent)); fixture.detectChanges();
    expect(stage.hasAttribute('inert')).toBe(false);
    portal.show(new ComponentPortal(OverlayContent), { blockWorkspace: true }); fixture.detectChanges();
    portal.hide(); fixture.detectChanges(); expect(stage.hasAttribute('inert')).toBe(false);
    expect(stage.classList.contains('v1-route-stage--blocked')).toBe(false);
  });

  it('starts the route animation stage in the welcome state', () => {
    expect(fixture.componentInstance.routeMotion()).toBe('welcome');
  });
});

function createNavigation() {
  return {
    headerFacility: () => undefined, isSingleSiteWorkspace: () => false, scopeChangePending: () => false, scopeAvailability: () => '', scopeNotice: () => '', contextNavigationError: () => '',
    isWorkspaceRoute: vi.fn(() => false),
    showWelcome: vi.fn()
  };
}
