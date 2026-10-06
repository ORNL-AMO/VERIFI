import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from '@platform/analytics/analytics.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppStartupState } from './application-lifecycle/application-lifecycle.models';
import { AppComponent } from './app.component';

@NgModule({
  imports: [CommonModule],
  declarations: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class AppComponentTestModule { }

describe('AppComponent startup and workspace state', () => {
  let fixture: ComponentFixture<AppComponent>;
  const workspaceStatus = signal<'ready' | 'switching'>('switching');
  const startupState = signal<AppStartupState>({ status: 'ready' });

  beforeEach(() => {
    workspaceStatus.set('switching');
    startupState.set({ status: 'ready' });
    TestBed.configureTestingModule({
      imports: [AppComponentTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: {
            state: startupState,
            persistenceReady: signal(true),
            initialize: () => Promise.resolve({ status: 'ready' }),
            retry: () => Promise.resolve({ status: 'ready' })
          }
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
