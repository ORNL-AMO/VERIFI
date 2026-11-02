import { TemplatePortal } from '@angular/cdk/portal';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, DestroyRef, ElementRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormRecord } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FacilityActionsService } from '@app/v1/data/facilities/facility-actions.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';
import { PortfolioFacilityOrderService } from './portfolio-facility-order.service';

type PortfolioSettingsAction = 'apply' | 'delete';

@Component({
  selector: 'app-account-settings-portfolio',
  templateUrl: './account-settings-portfolio.component.html',
  styleUrls: ['../account-settings.component.css', './account-settings-portfolio.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsPortfolioComponent extends AccountSettingsDetailBase {
  private readonly portfolioFacilities = inject(FacilityActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private creationAccountGuid?: string;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  @ViewChild('createFacilityDrawer') private readonly createFacilityDrawer!: TemplateRef<unknown>;
  @ViewChild('portfolioActionModal') private readonly portfolioActionModal!: TemplateRef<unknown>;

  readonly facilityOrderService = inject(PortfolioFacilityOrderService);
  readonly facilities = this.facilityOrderService.facilities;
  readonly orderOptions = computed(() => this.facilities().map((_, index) => index + 1));
  readonly orderControls = new FormRecord<FormControl<number>>({});
  private readonly orderSubscriptions = new Map<string, Subscription>();
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

  constructor() {
    super();
    effect(() => {
      const facilities = this.facilities();
      const guids = new Set(facilities.map(facility => facility.guid));
      for (const guid of Object.keys(this.orderControls.controls)) {
        if (!guids.has(guid)) {
          this.orderSubscriptions.get(guid)?.unsubscribe();
          this.orderSubscriptions.delete(guid);
          this.orderControls.removeControl(guid, { emitEvent: false });
        }
      }
      facilities.forEach((facility, index) => {
        let control = this.orderControls.controls[facility.guid];
        if (!control) {
          control = new FormControl(index + 1, { nonNullable: true });
          this.orderControls.addControl(facility.guid, control, { emitEvent: false });
          this.orderSubscriptions.set(facility.guid, control.valueChanges.subscribe(position => {
            this.setFacilityPosition(facility.guid, position);
          }));
        }
        control.setValue(index + 1, { emitEvent: false });
        if (facilities.length === 1) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      });
    });
    inject(DestroyRef).onDestroy(() => {
      for (const subscription of this.orderSubscriptions.values()) subscription.unsubscribe();
    });
  }

  private setFacilityPosition(facilityGuid: string, position: number): void {
    const host = this.element.nativeElement;
    const document = host.ownerDocument;
    const focused = document.activeElement;
    this.facilityOrderService.move(facilityGuid, position - 1);
    if (focused instanceof HTMLSelectElement && host.contains(focused)) {
      afterNextRender(() => {
        if (focused.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true });
      }, { injector: this.injector });
    }
  }

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

  dropFacility(event: CdkDragDrop<readonly IdbFacility[]>): void {
    if (event.previousContainer !== event.container || !event.isPointerOverContainer)
      return;
    this.facilityOrderService.move(event.item.data.guid, event.currentIndex);
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
    this.creationAccountGuid = this.account()?.guid;
    this.isCreateFacilityDrawerOpen = true;
    this.modalPortal.show(new TemplatePortal(this.createFacilityDrawer, this.viewContainerRef));
  }

  closeCreateFacilityDrawer(): void {
    this.isCreateFacilityDrawerOpen = false;
    this.modalPortal.hide();
  }

  async openCreatedFacility(facility: IdbFacility): Promise<void> {
    const accountGuid = this.creationAccountGuid;
    const isCurrent = () => !this.destroyRef.destroyed && accountGuid === this.account()?.guid;
    if (!isCurrent() || !this.isCreateFacilityDrawerOpen || facility.accountId !== accountGuid) return;
    this.closeCreateFacilityDrawer();
    try {
      const opened = await this.router.navigate(this.navigation.facilitySettingsRoute(facility.guid));
      if (!opened && isCurrent()) this.saveError = 'Facility added. Its settings could not be opened; select the facility from the list to continue.';
    } catch {
      if (isCurrent()) this.saveError = 'Facility added. Its settings could not be opened; select the facility from the list to continue.';
    }
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
