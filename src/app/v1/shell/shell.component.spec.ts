import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AppearanceService } from '../appearance/appearance.service';
import { ShellHeaderComponent } from './header/shell-header.component';
import { ShellComponent } from './shell.component';
import { WorkspaceNavigationService } from './workspace-navigation.service';

@NgModule({
  imports: [CommonModule, RouterModule.forRoot([])],
  declarations: [ShellComponent, ShellHeaderComponent]
})
class ShellTestModule { }

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let appearance: {
    isDark: ReturnType<typeof vi.fn>;
    isCompact: ReturnType<typeof vi.fn>;
    hasSquareCorners: ReturnType<typeof vi.fn>;
    settings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    appearance = {
      isDark: vi.fn(() => true),
      isCompact: vi.fn(() => true),
      hasSquareCorners: vi.fn(() => false),
      settings: vi.fn(() => ({
        palette: 'blueprint',
        mode: 'dark',
        density: 'compact',
        cornerStyle: 'soft'
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
    expect(root.classList.contains('v1-palette-blueprint')).toBe(true);
    expect(root.classList.contains('v1-density-compact')).toBe(true);
    expect(root.classList.contains('v1-corners-square')).toBe(false);
  });

  it('hosts the shared shell header above routed content', () => {
    expect(fixture.nativeElement.querySelector('app-shell-header')).not.toBeNull();
  });
});

function createNavigation() {
  return {
    isWorkspaceRoute: vi.fn(() => false),
    showWelcome: vi.fn()
  };
}
