import { Component, computed, effect, inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { FacilityReportWorkbenchContext } from './facility-report-workbench-context.service';
import { FacilityReportAutosaveService } from './editing/facility-report-autosave.service';
import { hasFacilityReportDataChecks } from './facility-report-workbench.models';

@Component({
  selector: 'app-facility-report-workbench', standalone: false,
  templateUrl: './facility-report-workbench.component.html',
  styleUrls: ['./facility-report-workbench.component.css'],
  providers: [FacilityReportWorkbenchContext, FacilityReportAutosaveService],
  host: { '(window:beforeunload)': 'beforeUnload($event)' }
})
export class FacilityReportWorkbenchComponent {
  readonly context = inject(FacilityReportWorkbenchContext);
  readonly editor = inject(FacilityReportAutosaveService);
  private readonly router = inject(Router);
  readonly previous = computed(() => {
    const stages = this.context.stages();
    return stages[stages.findIndex(stage => stage.current) - 1];
  });
  readonly next = computed(() => {
    const stages = this.context.stages();
    return stages[stages.findIndex(stage => stage.current) + 1];
  });


  constructor() {
    effect(() => {
      const report = this.context.report();
      if (report && this.context.stage() === 'data-checks' && !hasFacilityReportDataChecks(report)) {
        void this.router.navigate(this.context.navigation.facilityReportWorkbenchRoute(report.facilityId, report.guid), { replaceUrl: true });
      }
    });
  }

  switchReport(guid: string): void {
    const report = this.context.reports().find(item => item.guid === guid);
    if (report) void this.router.navigate(this.context.navigation.facilityReportWorkbenchRoute(report.facilityId, report.guid));
  }

  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editor.needsProtection()) { event.preventDefault(); event.returnValue = ''; }
  }
}

export const facilityReportLeaveGuard: CanDeactivateFn<FacilityReportWorkbenchComponent> = component => component.editor.flush();
