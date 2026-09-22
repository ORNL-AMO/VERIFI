import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { HasUnsavedChanges } from '../unsaved-changes.guard';
import { displayGridFactorRate, gridFactorYearCoverage, latestGridFactorRate } from './custom-grid-factor.models';
import { CustomGridFactorImpact, CustomGridFactorService } from './custom-grid-factor.service';

interface CustomGridFactorCard {
  readonly item: IdbCustomEmissionsItem;
  readonly impact: CustomGridFactorImpact;
  readonly methodLabel: string;
  readonly locationCoverage: string;
  readonly residualCoverage: string;
  readonly locationRate: string;
  readonly residualRate: string;
}

@Component({
  selector: 'app-custom-grid-factors',
  templateUrl: './custom-grid-factors.component.html',
  styleUrls: ['./custom-grid-factors.component.css'],
  standalone: false
})
export class CustomGridFactorsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly gridFactors = inject(CustomGridFactorService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('deleteGridFactorModal') private readonly deleteGridFactorModal!: TemplateRef<unknown>;

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly workspaceError = this.workspace.error;
  readonly selectedItem = signal<IdbCustomEmissionsItem | undefined>(undefined);
  readonly itemToDelete = signal<IdbCustomEmissionsItem | undefined>(undefined);
  readonly editorOpen = signal(false);
  readonly editorImpact = computed(() => {
    const item = this.selectedItem();
    return item ? this.gridFactors.impactFor(item) : undefined;
  });
  readonly deleteImpact = computed(() => {
    const item = this.itemToDelete();
    return item ? this.gridFactors.impactFor(item) : undefined;
  });
  readonly cards = computed<CustomGridFactorCard[]>(() => [...this.workspace.customEmissions()]
    .sort((a, b) => (a.subregion || '').localeCompare(b.subregion || ''))
    .map(item => {
      const direct = item.directEmissionsRate === true;
      const latestLocation = latestGridFactorRate(item.locationEmissionRates);
      const latestResidual = latestGridFactorRate(item.residualEmissionRates);
      return {
        item,
        impact: this.gridFactors.impactFor(item),
        methodLabel: direct ? 'Direct rate' : 'Calculated factors',
        locationCoverage: gridFactorYearCoverage(item.locationEmissionRates),
        residualCoverage: gridFactorYearCoverage(item.residualEmissionRates),
        locationRate: this.formatRate(displayGridFactorRate(latestLocation, direct), latestLocation?.year),
        residualRate: this.formatRate(displayGridFactorRate(latestResidual, direct), latestResidual?.year)
      };
    }));

  editorDirty = false;
  editorSaving = false;
  deleteError = '';
  isDeleting = false;

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
    this.selectedItem.set(undefined);
    this.openEditor();
  }

  openEdit(item: IdbCustomEmissionsItem): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.selectedItem.set(item);
    this.openEditor();
  }

  requestCloseEditor(): void {
    if (this.editorSaving) return;
    if (this.hasUnsavedChanges() && !window.confirm('Discard unsaved grid factor changes?')) return;
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

  requestDelete(item: IdbCustomEmissionsItem): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.deleteError = '';
    this.itemToDelete.set(item);
    this.modalPortal.show(new TemplatePortal(this.deleteGridFactorModal, this.viewContainerRef));
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.itemToDelete.set(undefined);
    this.modalPortal.hide();
  }

  async confirmDelete(): Promise<void> {
    const item = this.itemToDelete();
    if (!item || this.gridFactors.impactFor(item).isUsed || this.isDeleting) return;
    this.deleteError = '';
    this.isDeleting = true;
    try {
      await this.gridFactors.delete(item);
      this.itemToDelete.set(undefined);
      this.modalPortal.hide();
    } catch (error) {
      console.warn('v1 custom grid factor delete failed.', error);
      this.deleteError = 'The grid factor could not be deleted. Please try again.';
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
    this.selectedItem.set(undefined);
    this.editorDirty = false;
    this.editorSaving = false;
  }

  private formatRate(value: number | undefined, year: number | undefined): string {
    if (value === undefined || !Number.isFinite(value) || year === undefined) return 'Not set';
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} kg CO₂e/MWh (${year})`;
  }
}
