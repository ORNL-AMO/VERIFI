import { Component, Signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AnalyticsService } from './analytics/analytics.service';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppStartupState } from './application-lifecycle/application-lifecycle.models';
import { WorkspaceStatus } from './account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from './account-workspace/account-workspace.store';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent {
  readonly startupState: Signal<AppStartupState>;
  readonly workspaceStatus: Signal<WorkspaceStatus>;

  constructor(
    public router: Router,
    public lifecycle: ApplicationLifecycleService,
    private workspace: AccountWorkspaceStore,
    private analyticsService: AnalyticsService
  ) {
    this.startupState = this.lifecycle.state;
    this.workspaceStatus = this.workspace.status;
    if (environment.production) {
      try {
        this.analyticsService.sendEvent('verifi_app_open', undefined);
      } catch (error) {
        console.warn('Application-open analytics could not be sent.', error);
      }
    }
  }

  ngOnInit(): void {
    void this.lifecycle.initialize();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (environment.production) {
          try {
            const pagePath = this.analyticsService.getPageWithoutId(event.urlAfterRedirects);
            this.analyticsService.sendEvent('page_view', pagePath);
          } catch (error) {
            console.warn('Page-view analytics could not be sent.', error);
          }
        }
      }
    });
  }

  retryStartup(): void {
    void this.lifecycle.retry();
  }
}
