import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
  METER_DASHBOARD_MODES,
  MetersDashboardMode
} from '../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { MetersBrowseViewComponent } from './meters-browse-view/meters-browse-view.component';
import { MetersGroupingViewComponent } from './meters-grouping-view/meters-grouping-view.component';

@Component({
  selector: 'app-meters-dashboard',
  templateUrl: './meters-dashboard.component.html',
  styleUrls: ['./meters-dashboard.component.css'],
  standalone: true,
  imports: [
    MetersBrowseViewComponent,
    MetersGroupingViewComponent
  ],
  providers: [MetersDashboardActionsService]
})
export class MetersDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly dashboardModes = signal(METER_DASHBOARD_MODES);
  readonly activeMode = signal<MetersDashboardMode>('meters');

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.syncModeFromRoute(params));
  }

  setMode(mode: MetersDashboardMode): void {
    this.activeMode.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode },
      queryParamsHandling: 'merge'
    });
  }

  private syncModeFromRoute(params: ParamMap): void {
    const requestedMode = params.get('mode');
    const mode = coerceDashboardMode(requestedMode);
    this.activeMode.set(mode);
    if (requestedMode && requestedMode !== mode) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { mode },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }
}

function coerceDashboardMode(value: string | null): MetersDashboardMode {
  return value === 'grouping' ? 'grouping' : 'meters';
}
