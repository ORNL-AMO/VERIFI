import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { facilityMeterRoute, visualizationDashboardRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';
import type { MeterResultsChartPresentation } from '@app/v1/shared/charts/metric-results-chart.models';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';

export interface MonthlyMeterVisualizationReturn {
  readonly facilityGuid: string;
  readonly meterGuid: string;
  readonly presentation: MeterResultsChartPresentation;
  readonly scrollTop: number;
}

/** Allowlisted session return context, separate from saved visualization intent. */
@Injectable({ providedIn: 'root' })
export class VisualizationNavigationService {
  private readonly router = inject(Router);
  private readonly returns = new Map<string, string | undefined>();
  private readonly captures = signal<ReadonlyMap<string, MonthlyMeterVisualizationReturn>>(new Map());
  private readonly meterViews = new Map<string, MonthlyMeterVisualizationReturn>();
  readonly dashboardRoute = visualizationDashboardRoute;
  readonly workbenchRoute = visualizationWorkbenchRoute;

  rememberReturn(accountGuid: string, facilityGuid?: string): void {
    this.returns.set(accountGuid, facilityGuid);
  }

  open(accountGuid: string, guid: string): Promise<boolean> {
    return this.router.navigate(visualizationWorkbenchRoute(accountGuid, guid));
  }

  rememberMonthlyMeter(accountGuid: string, guid: string, context: MonthlyMeterVisualizationReturn): void {
    const value = structuredClone(context);
    this.captures.update(current => new Map(current).set(JSON.stringify([accountGuid, guid]), value));
    this.meterViews.set(JSON.stringify([accountGuid, value.facilityGuid, value.meterGuid]), value);
    this.rememberReturn(accountGuid, value.facilityGuid);
  }

  monthlyMeterReturn(accountGuid: string, guid: string): MonthlyMeterVisualizationReturn | undefined {
    return this.captures().get(JSON.stringify([accountGuid, guid]));
  }

  monthlyMeterView(accountGuid: string, facilityGuid: string, meterGuid: string): MonthlyMeterVisualizationReturn | undefined {
    return this.meterViews.get(JSON.stringify([accountGuid, facilityGuid, meterGuid]));
  }

  canReturnToMonthlyMeter(accountGuid: string, guid: string, snapshot: AccountWorkspaceSnapshot | undefined): boolean {
    const context = this.monthlyMeterReturn(accountGuid, guid);
    return !!context && snapshot?.account.guid === accountGuid
      && snapshot.facilities.some(item => item.guid === context.facilityGuid && item.accountId === accountGuid)
      && snapshot.meters.some(item => item.guid === context.meterGuid && item.facilityId === context.facilityGuid && item.accountId === accountGuid);
  }

  returnToMonthlyMeter(accountGuid: string, guid: string, snapshot: AccountWorkspaceSnapshot | undefined): Promise<boolean> {
    const context = this.monthlyMeterReturn(accountGuid, guid);
    if (!context || !this.canReturnToMonthlyMeter(accountGuid, guid, snapshot)) return Promise.resolve(false);
    this.meterViews.set(JSON.stringify([accountGuid, context.facilityGuid, context.meterGuid]), context);
    return this.router.navigate(facilityMeterRoute(context.facilityGuid, context.meterGuid, 'monthly-chart'));
  }

  returnToDashboard(accountGuid: string): Promise<boolean> {
    const facility = this.returns.get(accountGuid);
    return this.router.navigate(visualizationDashboardRoute(accountGuid), { queryParams: facility ? { facility } : {} });
  }
}
