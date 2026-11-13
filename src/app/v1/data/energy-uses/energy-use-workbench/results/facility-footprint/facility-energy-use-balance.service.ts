import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';

@Injectable()
export class FacilityEnergyUseBalanceService {
  readonly readings = inject(AccountWorkspaceStore).meterData;
  private readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly projection = computed(() => {
    const base = this.base(), facility = this.context.group()?.facility;
    return base.state === 'ready' && facility && this.context.workspace.ready() ? this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid }, energyUnit: facility.energyUnit, energyIsSource: false, includeEmissions: false
    }) : undefined;
  });
  readonly state = computed(() => this.base().state === 'ready' ? this.projection()?.state ?? 'idle' : this.base().state);
  readonly meters = computed(() => this.state() === 'ready' ? this.projection()?.meters ?? [] : []);
  retry(): void { this.calendarization.retry(); }
}
