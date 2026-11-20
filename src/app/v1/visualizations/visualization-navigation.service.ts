import { HomeReturnService } from '@app/v1/home/home-return.service';
import { Injectable, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { visualizationDashboardRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';

/** Workspace navigation and Dashboard scope, separate from saved chart intent. */
@Injectable({ providedIn: 'root' })
export class VisualizationNavigationService {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private homeReturns?: HomeReturnService;
  private readonly returns = new Map<string, string | undefined>();
  readonly dashboardRoute = visualizationDashboardRoute;
  readonly workbenchRoute = visualizationWorkbenchRoute;

  rememberReturn(accountGuid: string, facilityGuid?: string): void {
    this.homeReturns?.clear();
    this.returns.set(accountGuid, facilityGuid);
  }

  openFromHome(token: Parameters<HomeReturnService['remember']>[0]): Promise<boolean> {
    (this.homeReturns ??= this.injector.get(HomeReturnService)).remember(token);
    return this.open(token.accountGuid, token.chartGuid);
  }
  hasHomeReturn(accountGuid: string): boolean { return this.homeReturns?.available(accountGuid) ?? false; }
  open(accountGuid: string, guid: string): Promise<boolean> {
    return this.router.navigate(visualizationWorkbenchRoute(accountGuid, guid));
  }

  async returnToDashboard(accountGuid: string): Promise<boolean> {
    const home = await this.homeReturns?.return(accountGuid);
    if (home !== undefined) return home;
    const facility = this.returns.get(accountGuid);
    return this.router.navigate(visualizationDashboardRoute(accountGuid), { queryParams: facility ? { facility } : {} });
  }
}
