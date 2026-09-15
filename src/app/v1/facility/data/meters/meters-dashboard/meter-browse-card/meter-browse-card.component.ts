import { TemplatePortal } from '@angular/cdk/portal';
import { Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { MeterCardView, MeterUsageFactsView, MeterWorkbenchTabId } from '@app/v1/facility/data/meters/facility-meters.models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { ConfirmCopyMeterModalComponent } from './confirm-copy-meter-modal/confirm-copy-meter-modal.component';
import { ConfirmDeleteMeterModalComponent } from './confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-browse-card',
  templateUrl: './meter-browse-card.component.html',
  styleUrls: ['./meter-browse-card.component.css'],
  standalone: true,
  imports: [ConfirmCopyMeterModalComponent, ConfirmDeleteMeterModalComponent, IconComponent]
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
  readonly placeholderUsageFacts: MeterUsageFactsView = {
    facts: [
      { id: 'latest-month', label: 'Latest month', valueLabel: 'Not available', unavailable: true },
      { id: 'previous-year-month', label: 'Same month last year', valueLabel: 'Not available', unavailable: true },
      { id: 'latest-twelve-month-average', label: 'Latest 12-mo avg', valueLabel: 'Not available', unavailable: true },
      { id: 'previous-twelve-month-average', label: 'Previous 12-mo avg', valueLabel: 'Not available', unavailable: true }
    ]
  };

  @ViewChild('copyMeterConfirmModal') private readonly copyMeterConfirmModal!: TemplateRef<unknown>;
  @ViewChild('deleteMeterConfirmModal') private readonly deleteMeterConfirmModal!: TemplateRef<unknown>;
  @Input({ required: true }) card!: MeterCardView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;
  @Input() usageFactsLoading = false;

  get displayUsageFacts(): MeterUsageFactsView | undefined {
    return this.card?.usageFacts ?? (this.usageFactsLoading ? this.placeholderUsageFacts : undefined);
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
