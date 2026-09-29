import { TemplatePortal } from '@angular/cdk/portal';
import { Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { MeterCardView, MeterWorkbenchTabId } from '@app/v1/facility/data/meters/models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { ConfirmCopyMeterModalComponent } from './confirm-copy-meter-modal/confirm-copy-meter-modal.component';
import { ConfirmDeleteMeterModalComponent } from './confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction, ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { buildMeterResourceView } from './meter-browse-card.view';

@Component({
  selector: 'app-meter-browse-card',
  host: { class: 'v1-resource-browse-card-host' },
  templateUrl: './meter-browse-card.component.html',
  styleUrls: ['./meter-browse-card.component.css'],
  standalone: true,
  imports: [ConfirmCopyMeterModalComponent, ConfirmDeleteMeterModalComponent, ResourceBrowseCardComponent]
})
export class MeterBrowseCardComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private activeModal: 'copy' | 'delete' | undefined;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly meterToCopy = signal<MeterCardView | undefined>(undefined);
  readonly meterToDelete = signal<MeterCardView | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  @ViewChild('copyMeterConfirmModal') private readonly copyMeterConfirmModal!: TemplateRef<unknown>;
  @ViewChild('deleteMeterConfirmModal') private readonly deleteMeterConfirmModal!: TemplateRef<unknown>;
  @Input({ required: true }) card!: MeterCardView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;
  @Input() usageFactsLoading = false;

  get resourceView(): ResourceBrowseCardView {
    return buildMeterResourceView(this.card, {
      facility: this.showFacilityHeader ? this.portfolioFacility : undefined,
      usageFactsLoading: this.usageFactsLoading,
      errorMessage: this.actionError()
    });
  }

  get resourceActions(): ReadonlyArray<ResourceBrowseCardAction> {
    return [
      { id: 'readings', label: 'Open readings', icon: 'table' },
      { id: 'copy', label: 'Copy meter', icon: 'copy', disabled: !this.canAct(), loading: this.saving() },
      { id: 'delete', label: 'Delete meter', icon: 'delete', tone: 'danger', disabled: !this.canAct() }
    ];
  }

  ngOnDestroy(): void {
    this.hideActiveModal();
  }

  openSettings(): void {
    this.openMeterTab('settings');
  }

  openReadings(): void {
    this.openMeterTab('readings');
  }

  handleCardAction(actionId: string): void {
    if (actionId === 'readings') this.openReadings();
    if (actionId === 'copy') this.requestCopyMeter();
    if (actionId === 'delete') this.requestDeleteMeter();
  }

  requestCopyMeter(): void {
    if (this.canAct()) {
      this.meterToCopy.set(this.card);
      this.actionError.set(undefined);
      this.showModal('copy', this.copyMeterConfirmModal);
    }
  }

  cancelCopyMeter(): void {
    if (!this.saving()) {
      this.meterToCopy.set(undefined);
      this.hideActiveModal();
    }
  }

  async confirmCopyMeter(): Promise<void> {
    const card = this.meterToCopy();
    if (!card) {
      return;
    }
    await this.runAction(async () => {
      const meter = await this.actions.copyMeter(card.meter);
      this.meterToCopy.set(undefined);
      this.hideActiveModal();
      this.openMeterTab('settings', meter.guid);
    });
  }

  requestDeleteMeter(): void {
    if (this.canAct()) {
      this.meterToDelete.set(this.card);
      this.actionError.set(undefined);
      this.showModal('delete', this.deleteMeterConfirmModal);
    }
  }

  cancelDeleteMeter(): void {
    if (!this.saving()) {
      this.meterToDelete.set(undefined);
      this.hideActiveModal();
    }
  }

  async confirmDeleteMeter(): Promise<void> {
    const card = this.meterToDelete();
    if (!card) {
      return;
    }
    await this.runAction(async () => {
      await this.actions.deleteMeter(card.meter);
      this.meterToDelete.set(undefined);
      this.hideActiveModal();
    });
  }

  private openMeterTab(tab: MeterWorkbenchTabId, meterGuid = this.card.meter.guid): void {
    const facility = this.portfolioFacility ?? this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, tab));
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

  private showModal(type: 'copy' | 'delete', template: TemplateRef<unknown>): void {
    this.activeModal = type;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }

  private hideActiveModal(): void {
    if (this.activeModal) {
      this.activeModal = undefined;
      this.modalPortal.hide();
    }
  }
}
