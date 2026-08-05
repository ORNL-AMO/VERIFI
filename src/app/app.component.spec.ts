import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics/analytics.service';
import { AccountWorkspaceStore } from './account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppComponent } from './app.component';

@NgModule({
  imports: [CommonModule],
  declarations: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class AppComponentTestModule { }

describe('AppComponent workspace switching state', () => {
  let fixture: ComponentFixture<AppComponent>;
  const workspaceStatus = signal<'ready' | 'switching'>('switching');

  beforeEach(() => {
    workspaceStatus.set('switching');
    TestBed.configureTestingModule({
      imports: [AppComponentTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: {
            state: signal({ status: 'ready' }),
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
});
