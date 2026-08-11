import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics/analytics.service';
import { AccountWorkspaceStore } from './account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppComponent } from './app.component';

@NgModule({
  imports: [CommonModule, RouterOutlet],
  declarations: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class AppComponentTestModule { }

describe('AppComponent shell state', () => {
  let fixture: ComponentFixture<AppComponent>;
  const workspaceStatus = signal<'ready' | 'switching'>('switching');
  const startupState = signal<any>({ status: 'ready' });
  const lifecycle = {
    state: startupState,
    persistenceReady: signal(true),
    initialize: () => Promise.resolve({ status: 'ready' }),
    retry: () => Promise.resolve({ status: 'ready' })
  };

  beforeEach(() => {
    workspaceStatus.set('switching');
    startupState.set({ status: 'ready' });
    TestBed.configureTestingModule({
      imports: [AppComponentTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: lifecycle
        },
        { provide: AccountWorkspaceStore, useValue: { status: workspaceStatus } },
        {
          provide: Router,
          useValue: { url: '/data-evaluation/account', events: of() }
        },
        {
          provide: AnalyticsService,
          useValue: { sendEvent: () => undefined, getPageWithoutId: (url: string) => url }
        }
      ]
    });
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('renders an accessible startup screen while the application initializes', () => {
    startupState.set({ status: 'initializing', message: 'Loading workspace...' });
    fixture.detectChanges();

    const startupContent: HTMLElement = fixture.nativeElement.querySelector('.app-startup-content');

    expect(startupContent).not.toBeNull();
    expect(startupContent.getAttribute('aria-busy')).toBe('true');
    expect(startupContent.textContent).toContain('Loading workspace...');
  });

  it('renders startup errors with retry and support links', () => {
    startupState.set({
      status: 'error',
      error: {
        message: 'IndexedDB could not be opened.',
        step: 'open-persistence'
      }
    });
    fixture.detectChanges();

    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');

    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Application data could not be initialized');
    expect(alert.textContent).toContain('IndexedDB could not be opened.');
    expect(alert.textContent).toContain('open-persistence');
  });

  it('renders one full-viewport switching layer while the workspace changes', () => {
    const overlay: HTMLElement = fixture.nativeElement.querySelector('.workspace-switch-overlay');

    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.getAttribute('aria-busy')).toBe('true');
    expect(overlay.textContent).toContain('Switching accounts...');
    expect(fixture.nativeElement.querySelector('.windowOverlay')).toBeNull();
  });

  it('removes the switching layer when the workspace is ready', () => {
    workspaceStatus.set('ready');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workspace-switch-overlay')).toBeNull();
  });
});
