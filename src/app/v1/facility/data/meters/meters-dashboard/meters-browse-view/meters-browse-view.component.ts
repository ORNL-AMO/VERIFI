import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { MeterDraft } from '../../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterBrowseCardComponent } from './meter-browse-card/meter-browse-card.component';
import { MeterDraftSlideoutComponent } from '../meter-dashboard-slideout/meter-draft-slideout/meter-draft-slideout.component';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';

@Component({
  selector: 'app-meters-browse-view',
  templateUrl: './meters-browse-view.component.html',
  styleUrls: ['./meters-browse-view.component.css'],
  standalone: true,
  imports: [MeterBrowseCardComponent, MeterDraftSlideoutComponent]
})
export class MetersBrowseViewComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly addMeterOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());

  openAddMeter(): void {
    if (this.canAct()) {
      this.addMeterOpen.set(true);
      this.actionError.set(undefined);
    }
  }

  closeAddMeter(): void {
    if (!this.saving()) {
      this.addMeterOpen.set(false);
      this.actionError.set(undefined);
    }
  }

  async saveMeterDraft(draft: MeterDraft): Promise<void> {
    await this.runAction(async () => {
      const meter = await this.actions.createMeter(draft);
      this.addMeterOpen.set(false);
      this.openCreatedMeter(meter.guid);
    });
  }

  private openCreatedMeter(meterGuid: string): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, 'settings'));
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      await action();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The meter change could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
}
