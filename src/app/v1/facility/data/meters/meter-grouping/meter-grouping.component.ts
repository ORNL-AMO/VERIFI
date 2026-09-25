import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import {
  MeterCardView,
  MeterDropEvent,
  MeterGroupDraft,
  MeterGroupDropTarget,
  MetersGroupingSlideout,
  meterGroupDropListId,
  meterGroupTargetFromSection
} from '@app/v1/facility/data/meters/models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { MeterGroupDraftSlideoutComponent } from './meter-group-draft-slideout/meter-group-draft-slideout.component';
import { MeterGroupLaneComponent } from './meter-group-lane/meter-group-lane.component';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { MoveMeterSlideoutComponent } from './move-meter-slideout/move-meter-slideout.component';
import { ConfirmDeleteGroupModalComponent } from './confirm-delete-group-modal/confirm-delete-group-modal.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';

@Component({
  selector: 'app-meter-grouping',
  templateUrl: './meter-grouping.component.html',
  styleUrls: ['./meter-grouping.component.css'],
  standalone: true,
  imports: [
    IconComponent,
    DataEmptyStateComponent,
    MeterGroupLaneComponent,
    MeterGroupDraftSlideoutComponent,
    MoveMeterSlideoutComponent,
    ConfirmDeleteGroupModalComponent,
    RouterLink
  ]
})
export class MeterGroupingComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private deleteModalOpen = false;

  @ViewChild('deleteGroupConfirmModal') private readonly deleteGroupConfirmModal?: TemplateRef<unknown>;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly slideout = signal<MetersGroupingSlideout | undefined>(undefined);
  readonly groupToDelete = signal<IdbUtilityMeterGroup | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly accountMetersRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'meters'] : undefined;
  });
  readonly dropListIds = computed(() => this.workspace.groupSections().map(section => meterGroupDropListId(section.id)));
  readonly moveTargets = computed(() => this.workspace.groupSections().map(section => meterGroupTargetFromSection(section)));
  readonly assignedMeterCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const section of this.workspace.groupSections()) {
      if (section.group) {
        counts.set(section.group.guid, section.meters.length);
      }
    }
    return counts;
  });
  readonly groupToDeleteAssignedMeterCount = computed(() => {
    const group = this.groupToDelete();
    return group ? this.assignedMeterCount(group) : 0;
  });
  readonly canDrop = (card: MeterCardView, target: MeterGroupDropTarget): boolean =>
    this.canAct() && this.actions.canAssignMeterToTarget(card.meter, target);

  ngOnDestroy(): void {
    this.hideDeleteModal();
  }

  openMeter(meter: IdbUtilityMeter): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'));
    }
  }

  openMeterCard(card: MeterCardView): void {
    this.openMeter(card.meter);
  }

  openGroup(section: { readonly group?: IdbUtilityMeterGroup }): void {
    const facility = this.workspace.facility();
    if (facility && section.group) {
      void this.router.navigate(this.navigation.facilityMeterGroupRoute(facility.guid, section.group.guid, 'monthly-table'));
    }
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
    const template = this.deleteGroupConfirmModal;
    if (!this.canAct() || !template) {
      return;
    }
    this.groupToDelete.set(group);
    this.slideout.set(undefined);
    this.actionError.set(undefined);
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }

  cancelDeleteGroup(): void {
    if (!this.saving()) {
      this.groupToDelete.set(undefined);
      this.hideDeleteModal();
      this.actionError.set(undefined);
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
      this.hideDeleteModal();
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
    return this.assignedMeterCounts().get(group.guid) ?? 0;
  }

  private openSlideout(slideout: MetersGroupingSlideout): void {
    if (this.canAct()) {
      this.slideout.set(slideout);
      this.actionError.set(undefined);
    }
  }

  private hideDeleteModal(): void {
    if (this.deleteModalOpen) {
      this.deleteModalOpen = false;
      this.modalPortal.hide();
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
