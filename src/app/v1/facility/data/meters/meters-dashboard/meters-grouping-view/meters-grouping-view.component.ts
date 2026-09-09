import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import {
  MeterCardView,
  MeterDropEvent,
  MeterGroupDraft,
  MeterGroupDropTarget,
  MetersGroupingSlideout,
  meterGroupDropListId,
  meterGroupTargetFromSection
} from '../../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { ConfirmDeleteGroupModalComponent } from '../confirm-delete-group-modal/confirm-delete-group-modal.component';
import { MeterGroupDraftSlideoutComponent } from '../meter-group-draft-slideout/meter-group-draft-slideout.component';
import { MeterGroupLaneComponent } from '../meter-group-lane/meter-group-lane.component';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';
import { MoveMeterSlideoutComponent } from '../move-meter-slideout/move-meter-slideout.component';

@Component({
  selector: 'app-meters-grouping-view',
  templateUrl: './meters-grouping-view.component.html',
  styleUrls: ['./meters-grouping-view.component.css'],
  standalone: true,
  imports: [
    MeterGroupLaneComponent,
    MeterGroupDraftSlideoutComponent,
    MoveMeterSlideoutComponent,
    ConfirmDeleteGroupModalComponent
  ]
})
export class MetersGroupingViewComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly slideout = signal<MetersGroupingSlideout | undefined>(undefined);
  readonly groupToDelete = signal<IdbUtilityMeterGroup | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly dropListIds = computed(() => this.workspace.groupSections().map(section => meterGroupDropListId(section.id)));
  readonly moveTargets = computed(() => this.workspace.groupSections().map(section => meterGroupTargetFromSection(section)));
  readonly canDrop = (card: MeterCardView, target: MeterGroupDropTarget): boolean =>
    this.canAct() && this.actions.canAssignMeterToTarget(card.meter, target);

  openMeter(meter: IdbUtilityMeter): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'));
    }
  }

  openMeterCard(card: MeterCardView): void {
    this.openMeter(card.meter);
  }

  openAddGroup(): void {
    this.openSlideout({ kind: 'add-group' });
  }

  openEditGroup(section: { readonly group?: IdbUtilityMeterGroup }): void {
    if (section.group) {
      this.openSlideout({
        kind: 'edit-group',
        group: section.group,
        assignedMeterCount: this.assignedMeterCount(section.group)
      });
    }
  }

  openMoveMeter(card: MeterCardView): void {
    this.openSlideout({ kind: 'move-meter', card });
  }

  closeSlideout(): void {
    if (!this.saving()) {
      this.slideout.set(undefined);
      this.actionError.set(undefined);
    }
  }

  requestDeleteGroup(group: IdbUtilityMeterGroup): void {
    this.groupToDelete.set(group);
    this.slideout.set(undefined);
    this.actionError.set(undefined);
  }

  cancelDeleteGroup(): void {
    if (!this.saving()) {
      this.groupToDelete.set(undefined);
    }
  }

  async saveGroupDraft(draft: MeterGroupDraft): Promise<void> {
    const currentSlideout = this.slideout();
    await this.runAction(async () => {
      if (currentSlideout?.kind === 'edit-group') {
        await this.actions.updateGroup(currentSlideout.group, draft);
      } else {
        await this.actions.createGroup(draft);
      }
      this.slideout.set(undefined);
    });
  }

  async confirmDeleteGroup(): Promise<void> {
    const group = this.groupToDelete();
    if (!group) {
      return;
    }
    await this.runAction(async () => {
      await this.actions.deleteGroup(group);
      this.groupToDelete.set(undefined);
    });
  }

  async moveMeter(card: MeterCardView, target: MeterGroupDropTarget): Promise<void> {
    await this.runAction(async () => {
      await this.actions.reassignMeter(card.meter, target);
      if (this.slideout()?.kind === 'move-meter') {
        this.slideout.set(undefined);
      }
    });
  }

  onMeterDropped(event: MeterDropEvent): void {
    void this.moveMeter(event.card, event.target);
  }

  assignedMeterCount(group: IdbUtilityMeterGroup): number {
    return this.workspace.meters().filter(meter => meter.groupId === group.guid).length;
  }

  private openSlideout(slideout: MetersGroupingSlideout): void {
    if (this.canAct()) {
      this.slideout.set(slideout);
      this.actionError.set(undefined);
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
