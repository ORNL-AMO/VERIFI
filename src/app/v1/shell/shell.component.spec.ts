import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ShellHeaderComponent } from './header/shell-header.component';
import { ShellComponent } from './shell.component';
import { WorkspaceNavigationService } from './workspace-navigation.service';

@NgModule({
  imports: [CommonModule, IconComponent, NoopAnimationsModule, PortalModule, RouterModule.forRoot([])],
  declarations: [ShellComponent, ShellHeaderComponent]
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
  });

  it('hosts the shared shell header above routed content', () => {
    expect(fixture.nativeElement.querySelector('app-shell-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-route-stage router-outlet')).not.toBeNull();
  });

  it('starts the route animation stage in the welcome state', () => {
    expect(fixture.componentInstance.routeMotion()).toBe('welcome');
  });
});

function createNavigation() {
  return {
    isWorkspaceRoute: vi.fn(() => false),
    showWelcome: vi.fn()
  };
}
