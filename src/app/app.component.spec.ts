import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from '@platform/analytics/analytics.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppStartupState } from './application-lifecycle/application-lifecycle.models';
import { DatabaseResetService } from './application-lifecycle/database-reset.service';
import { MigrationRecoveryService } from './application-lifecycle/recovery/migration-recovery.service';
import { StartupErrorComponent } from './application-lifecycle/startup-error/startup-error.component';
import { AppComponent } from './app.component';

@NgModule({
  imports: [CommonModule, RouterModule.forRoot([])],
  declarations: [AppComponent, StartupErrorComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class AppComponentTestModule { }

describe('AppComponent shell state', () => {
  let fixture: ComponentFixture<AppComponent>;
  const workspaceStatus = signal<'ready' | 'switching'>('switching');
  const startupState = signal<AppStartupState>({ status: 'ready' });
  const lifecycle = {
    state: startupState,
    persistenceReady: signal(true),
    initialize: () => Promise.resolve({ status: 'ready' }),
    retry: vi.fn(async () => ({ status: 'ready' as const }))
  };

  beforeEach(() => {
    workspaceStatus.set('switching');
    startupState.set({ status: 'ready' });
    lifecycle.retry.mockClear();
    TestBed.configureTestingModule({
      imports: [AppComponentTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: lifecycle
        },
        { provide: AccountWorkspaceStore, useValue: { status: workspaceStatus } },
        { provide: MigrationRecoveryService, useValue: {} },
        { provide: DatabaseResetService, useValue: {} },
        {
          provide: AnalyticsService,
          useValue: { initialize: () => undefined, sendEvent: () => undefined, getPageWithoutId: (url: string) => url }
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
        step: 'database',
        retryable: true
      }
    });
    fixture.detectChanges();

    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');

    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Application data could not be initialized');
    expect(alert.textContent).toContain('IndexedDB could not be opened.');
    expect(alert.textContent).toContain('database');
    expect(alert.querySelector('a[href="/feedback"]')).not.toBeNull();
    expect(alert.querySelector('a[href="/privacy"]')).not.toBeNull();

    alert.querySelector<HTMLButtonElement>('button').click();

    expect(lifecycle.retry).toHaveBeenCalledOnce();
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

  it('delegates startup errors to the startup error component', () => {
    setStartupError('database');
    expect(fixture.nativeElement.querySelector('app-startup-error')).not.toBeNull();

    startupState.set({ status: 'ready' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-startup-error')).toBeNull();
  });

  function setStartupError(step: 'database' | 'migrations'): void {
    startupState.set({
      status: 'error',
      step,
      message: 'Startup failed.',
      error: { step, message: 'Startup failed.', retryable: true, cause: new Error('cause') }
    });
    fixture.detectChanges();
  }

});
