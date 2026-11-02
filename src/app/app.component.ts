import { Component, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '@platform/analytics/analytics.service';
import { ApplicationLifecycleService } from './application-lifecycle/application-lifecycle.service';
import { AppStartupState } from './application-lifecycle/application-lifecycle.models';
import { WorkspaceStatus } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

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
    this.analyticsService.initialize();
  }

  ngOnInit(): void {
    void this.lifecycle.initialize();
  }

  retryStartup(): void {
    void this.lifecycle.retry();
  }
}
