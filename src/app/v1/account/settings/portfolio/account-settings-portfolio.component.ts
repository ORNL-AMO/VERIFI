import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PortfolioFacilityService } from '../../portfolio/portfolio-facility.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

type PortfolioSettingsAction = 'apply' | 'delete';

@Component({
  selector: 'app-account-settings-portfolio',
  templateUrl: './account-settings-portfolio.component.html',
  styleUrls: ['../account-settings.component.css', './account-settings-portfolio.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsPortfolioComponent extends AccountSettingsDetailBase {
  private readonly portfolioFacilities = inject(PortfolioFacilityService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('portfolioActionModal') private readonly portfolioActionModal!: TemplateRef<unknown>;

  readonly facilities = this.workspace.facilities;
  readonly hasPending = this.workspace.hasPending;
  readonly selectedFacilityGuids = signal<readonly string[]>([]);
  readonly selectedFacilities = computed(() => {
    const selected = new Set(this.selectedFacilityGuids());
    return this.facilities().filter(facility => selected.has(facility.guid));
  });
  readonly allFacilitiesSelected = computed(() => {
    const facilities = this.facilities();
    return facilities.length > 0 && facilities.every(facility => this.selectedFacilityGuids().includes(facility.guid));
  });

  isCreateFacilityDrawerOpen = false;
  pendingAction?: PortfolioSettingsAction;
  isApplying = false;
  isDeleting = false;

  get selectedCount(): number {
    return this.selectedFacilities().length;
  }

  get actionsDisabled(): boolean {
    return !this.canWrite() || this.hasPending() || this.isApplying || this.isDeleting;
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.modalPortal.hide();
  }

  isSelected(facilityGuid: string): boolean {
    return this.selectedFacilityGuids().includes(facilityGuid);
  }

  toggleFacility(facilityGuid: string, selected: boolean): void {
    this.selectedFacilityGuids.update(current => {
      if (selected) {
        return current.includes(facilityGuid) ? current : [...current, facilityGuid];
      }
      return current.filter(guid => guid !== facilityGuid);
    });
  }

  toggleAllFacilities(selected: boolean): void {
    this.selectedFacilityGuids.set(selected ? this.facilities().map(facility => facility.guid) : []);
  }

  openCreateFacilityDrawer(): void {
    if (this.actionsDisabled) {
      return;
    }
    this.saveError = '';
    this.isCreateFacilityDrawerOpen = true;
  }

  closeCreateFacilityDrawer(): void {
    this.isCreateFacilityDrawerOpen = false;
  }

  openApplyConfirm(): void {
    this.openConfirm('apply');
  }

  openDeleteConfirm(): void {
    this.openConfirm('delete');
  }

  cancelConfirm(): void {
    if (this.isApplying || this.isDeleting) {
      return;
    }
    this.pendingAction = undefined;
    this.modalPortal.hide();
  }

  async confirmApplyAccountSettings(): Promise<void> {
    const facilities = this.selectedFacilities();
    if (this.actionsDisabled || facilities.length === 0) {
      return;
    }

    const facilityGuids = facilities.map(facility => facility.guid);
    this.pendingAction = undefined;
    this.modalPortal.hide();
    this.isApplying = true;
    await this.runSave('Applying account settings to facilities', async () => {
      await this.portfolioFacilities.applyAccountSettingsToFacilities(facilityGuids);
    });
    this.isApplying = false;
  }

  async confirmDeleteFacilities(): Promise<void> {
    const facilities = this.selectedFacilities();
    if (this.actionsDisabled || facilities.length === 0) {
      return;
    }

    this.pendingAction = undefined;
    this.modalPortal.hide();
    this.isDeleting = true;
    await this.runSave('Deleting selected facilities', async () => {
      for (const facility of facilities) {
        await this.portfolioFacilities.deleteFacility(facility);
      }
      this.selectedFacilityGuids.update(current => current.filter(guid => !facilities.some(facility => facility.guid === guid)));
    });
    this.isDeleting = false;
  }

  facilityLocation(facility: IdbFacility): string {
    return [facility.city, facility.state, facility.country].filter(Boolean).join(', ') || 'No location set';
  }

  private openConfirm(action: PortfolioSettingsAction): void {
    if (this.actionsDisabled || this.selectedCount === 0) {
      return;
    }
    this.saveError = '';
    this.pendingAction = action;
    this.modalPortal.show(new TemplatePortal(this.portfolioActionModal, this.viewContainerRef));
  }
}
