import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { HasUnsavedChanges } from '../unsaved-changes.guard';
import { globalWarmingPotentialValue } from './custom-gwp.models';
import { CustomGwpImpact, CustomGwpService } from './custom-gwp.service';

interface CustomGwpCard {
  readonly gwp: IdbCustomGWP;
  readonly impact: CustomGwpImpact;
  readonly valueLabel: string;
}

@Component({
  selector: 'app-custom-gwps',
  templateUrl: './custom-gwps.component.html',
  styleUrls: ['./custom-gwps.component.css'],
  standalone: false
})
export class CustomGwpsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly customGwps = inject(CustomGwpService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('deleteGwpModal') private readonly deleteGwpModal!: TemplateRef<unknown>;

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly workspaceError = this.workspace.error;
  readonly selectedGwp = signal<IdbCustomGWP | undefined>(undefined);
  readonly gwpToDelete = signal<IdbCustomGWP | undefined>(undefined);
  readonly editorOpen = signal(false);
  readonly assessmentReportVersion = computed<AssessmentReportVersion>(() => this.account()?.assessmentReportVersion ?? 'AR6');
  readonly editorImpact = computed(() => {
    const gwp = this.selectedGwp();
    return gwp ? this.customGwps.impactFor(gwp) : undefined;
  });
  readonly deleteImpact = computed(() => {
    const gwp = this.gwpToDelete();
    return gwp ? this.customGwps.impactFor(gwp) : undefined;
  });
  readonly cards = computed<CustomGwpCard[]>(() => {
    const version = this.assessmentReportVersion();
    return [...this.workspace.customGWPs()]
      .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
      .map(gwp => ({
        gwp,
        impact: this.customGwps.impactFor(gwp),
        valueLabel: `${globalWarmingPotentialValue(gwp, version).toLocaleString()} kg CO₂e/kg`
      }));
  });

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
    this.selectedGwp.set(undefined);
    this.openEditor();
  }

  openEdit(gwp: IdbCustomGWP): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.selectedGwp.set(gwp);
    this.openEditor();
  }

  requestCloseEditor(): void {
    if (this.editorSaving) return;
    if (this.hasUnsavedChanges() && !window.confirm('Discard unsaved global warming potential changes?')) return;
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

  requestDelete(gwp: IdbCustomGWP): void {
    if (!this.canWrite() || this.hasPending()) return;
    this.deleteError = '';
    this.gwpToDelete.set(gwp);
    this.modalPortal.show(new TemplatePortal(this.deleteGwpModal, this.viewContainerRef));
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.gwpToDelete.set(undefined);
    this.modalPortal.hide();
  }

  async confirmDelete(): Promise<void> {
    const gwp = this.gwpToDelete();
    if (!gwp || this.customGwps.impactFor(gwp).meterCount > 0 || this.isDeleting) return;
    this.deleteError = '';
    this.isDeleting = true;
    try {
      await this.customGwps.delete(gwp);
      this.gwpToDelete.set(undefined);
      this.modalPortal.hide();
    } catch (error) {
      console.warn('v1 custom GWP delete failed.', error);
      this.deleteError = 'The global warming potential could not be deleted. Please try again.';
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
    this.selectedGwp.set(undefined);
    this.editorDirty = false;
    this.editorSaving = false;
  }
}
