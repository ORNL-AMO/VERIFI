import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { displayEmissionsRate } from './custom-fuel.models';
import { CustomFuelImpact, CustomFuelService } from './custom-fuel.service';
import { HasUnsavedChanges } from '../unsaved-changes.guard';

interface CustomFuelCard {
  readonly fuel: IdbCustomFuel;
  readonly impact: CustomFuelImpact;
  readonly typeLabel: string;
  readonly phaseLabel: string;
  readonly emissionsLabel: string;
  readonly outputRateLabel: string;
}

@Component({
  selector: 'app-custom-fuels',
  templateUrl: './custom-fuels.component.html',
  styleUrls: ['./custom-fuels.component.css'],
  standalone: false
})
export class CustomFuelsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly customFuels = inject(CustomFuelService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('deleteFuelModal') private readonly deleteFuelModal!: TemplateRef<unknown>;

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly workspaceError = this.workspace.error;
  readonly selectedFuel = signal<IdbCustomFuel | undefined>(undefined);
  readonly fuelToDelete = signal<IdbCustomFuel | undefined>(undefined);
  readonly editorOpen = signal(false);
  readonly editorImpact = computed(() => {
    const fuel = this.selectedFuel();
    return fuel ? this.customFuels.impactFor(fuel) : undefined;
  });
  readonly deleteImpact = computed(() => {
    const fuel = this.fuelToDelete();
    return fuel ? this.customFuels.impactFor(fuel) : undefined;
  });

  editorDirty = false;
  editorSaving = false;
  deleteError = '';
  isDeleting = false;

  readonly cards = computed<CustomFuelCard[]>(() => {
    const account = this.account();
    if (!account) return [];
    return [...this.workspace.customFuels()]
      .sort((first, second) => (first.value || '').localeCompare(second.value || ''))
      .map(fuel => {
        const mobile = fuel.isMobile === true;
        const CO2 = mobile ? fuel.CO2 : displayEmissionsRate(fuel.CO2, account.energyUnit);
        const outputRate = mobile ? fuel.emissionsOutputRate : displayEmissionsRate(fuel.emissionsOutputRate, account.energyUnit);
        return {
          fuel,
          impact: this.customFuels.impactFor(fuel),
          typeLabel: mobile ? 'Mobile' : 'Stationary',
          phaseLabel: mobile ? (fuel.isOnRoad ? 'On-road' : 'Off-road') : (fuel.phase || 'Unspecified phase'),
          emissionsLabel: this.formatRate(CO2, mobile ? 'kg CO₂/gal' : `kg CO₂/${account.energyUnit}`),
          outputRateLabel: this.formatRate(outputRate, `kg CO₂e/${account.energyUnit}`)
        };
      });
  });

  constructor() {
    const unregister = this.unsavedChanges.register(
      () => this.hasUnsavedChanges(),
      () => this.closeEditor(),
      () => this.isNavigationBlocked()
    );
    this.destroyRef.onDestroy(unregister);
  }

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  hasUnsavedChanges(): boolean {
    return this.editorOpen() && this.editorDirty;
  }

  isNavigationBlocked(): boolean {
    return this.editorOpen() && this.editorSaving;
  }

  openAdd(): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.selectedFuel.set(undefined);
    this.openEditor();
  }

  openEdit(fuel: IdbCustomFuel): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.selectedFuel.set(fuel);
    this.openEditor();
  }

  requestCloseEditor(): void {
    if (this.editorSaving) return;
    if (this.hasUnsavedChanges() && !window.confirm('Discard unsaved custom fuel changes?')) {
      return;
    }
    this.closeEditor();
  }

  handleSaved(): void {
    this.editorDirty = false;
    this.closeEditor();
  }

  setEditorDirty(dirty: boolean): void {
    this.editorDirty = dirty;
  }

  setEditorSaving(saving: boolean): void {
    this.editorSaving = saving;
  }

  requestDelete(fuel: IdbCustomFuel): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.deleteError = '';
    this.fuelToDelete.set(fuel);
    this.modalPortal.show(new TemplatePortal(this.deleteFuelModal, this.viewContainerRef));
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.fuelToDelete.set(undefined);
    this.modalPortal.hide();
  }

  async confirmDelete(): Promise<void> {
    const fuel = this.fuelToDelete();
    if (!fuel || this.customFuels.impactFor(fuel).meterCount > 0 || this.isDeleting) return;
    this.deleteError = '';
    this.isDeleting = true;
    try {
      await this.customFuels.delete(fuel);
      this.fuelToDelete.set(undefined);
      this.modalPortal.hide();
    } catch (error) {
      console.warn('v1 custom fuel delete failed.', error);
      this.deleteError = 'The custom fuel could not be deleted. Please try again.';
    } finally {
      this.isDeleting = false;
    }
  }

  private openEditor(): void {
    this.editorDirty = false;
    this.editorSaving = false;
    this.editorOpen.set(true);
  }

  private closeEditor(): void {
    this.editorOpen.set(false);
    this.selectedFuel.set(undefined);
    this.editorDirty = false;
    this.editorSaving = false;
  }

  private formatRate(value: number | undefined, unit: string): string {
    if (value === undefined || value === null || !Number.isFinite(value)) return 'Not set';
    return `${value.toLocaleString(undefined, { maximumSignificantDigits: 5 })} ${unit}`;
  }
}
