import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { FacilityDataModule } from '@app/v1/facility/data/facility-data.module';
import { FacilityMetersComponent } from '@app/v1/facility/data/meters/facility-meters.component';
import { By } from '@angular/platform-browser';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

@Component({ standalone: true, template: 'Meter child' })
class MeterChild { readonly workspace = inject(FacilityMetersWorkspaceService); }
@Component({ standalone: true, template: 'Inventory' })
class InventoryDestination {}

describe('meter workbench provider lifetime', () => {
  it('releases calculation demand on exit and creates a fresh service on reentry', async () => {
    let subscriptions = 0;
    TestBed.configureTestingModule({ imports: [FacilityDataModule], providers: [
      AccountWorkspaceStore,
      { provide: WorkspaceCommandBoundary, useValue: {} },
      { provide: MeterCommandHandler, useValue: {} },
      { provide: WorkspaceNavigationService, useValue: {} },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), meterFindings: () => [] } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => new Observable(observer => {
        subscriptions++; observer.next(IDLE_WORKSPACE_CALENDARIZATION); return () => subscriptions--;
      }) } },
      provideRouter([
        { path: 'meters/:meterGuid', component: FacilityMetersComponent, children: [{ path: '', component: MeterChild }] },
        { path: 'inventory', component: InventoryDestination }
      ])
    ] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/meters/meter-a', FacilityMetersComponent);
    const first = harness.routeDebugElement!.injector.get(FacilityMetersWorkspaceService);
    expect(harness.routeDebugElement!.query(By.directive(MeterChild)).componentInstance.workspace).toBe(first);
    expect(subscriptions).toBe(1);
    await harness.navigateByUrl('/inventory', InventoryDestination);
    expect(subscriptions).toBe(0);
    await harness.navigateByUrl('/meters/meter-a', FacilityMetersComponent);
    expect(harness.routeDebugElement!.injector.get(FacilityMetersWorkspaceService)).not.toBe(first); expect(subscriptions).toBe(1);
  });
});
