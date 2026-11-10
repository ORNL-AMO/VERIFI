import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { EnergyUsesImportRowPreview } from '@data/import/energy-uses/energy-uses-excel-import.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ImportWizardStateService } from '../../import-wizard-state.service';

interface EquipmentReviewRow {
  readonly row: EnergyUsesImportRowPreview;
  readonly status: string;
  readonly skip: FormControl<boolean>;
}

@Component({
  selector: 'app-import-energy-uses', standalone: true, imports: [ReactiveFormsModule, WorkspaceSlideoutComponent],
  templateUrl: './import-energy-uses.component.html', styleUrls: ['./import-energy-uses.component.css']
})
export class ImportEnergyUsesComponent {
  readonly state = inject(ImportWizardStateService);
  readonly year = new FormControl<number | null>(null, [Validators.required, Validators.min(1000), Validators.max(9999), Validators.pattern(/^\d{4}$/)]);
  readonly rows = signal<readonly EquipmentReviewRow[]>([]);
  readonly details = signal<EnergyUsesImportRowPreview | undefined>(undefined);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private detailsPortal?: TemplatePortal;
  @ViewChild('changeDetails') private readonly changeDetails?: TemplateRef<unknown>;
  readonly hasRowErrors = computed(() => this.rows().some(entry => entry.row.errors.length > 0));
  readonly skippedCount = computed(() => this.state.energyUses.preview()?.rows.filter(row => row.skipped).length ?? 0);
  readonly columns = computed(() => this.hasRowErrors() ? 6 : 5);

  constructor() {
    effect(() => {
      const data = this.state.energyUses.draft()?.energyUses;
      const blocked = this.state.isNavigationBlocked() || this.state.committed();
      this.year.setValue(data?.year ?? null, { emitEvent: false });
      if (blocked) this.year.disable({ emitEvent: false });
      else this.year.enable({ emitEvent: false });
      if (data && !data.preview && this.year.valid && !blocked) untracked(() => this.review());
    });
    this.year.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed()).subscribe(year => {
      this.state.energyUses.setYear(year);
      this.closeDetails();
      if (this.year.valid) this.review();
      else this.state.error.set(undefined);
    });
    effect(onCleanup => {
      const blocked = this.state.isNavigationBlocked() || this.state.committed();
      const rows = (this.state.energyUses.preview()?.rows ?? [])
        .filter(row => row.skipped || row.action !== 'Unchanged')
        .map(row => ({ row, status: row.skipped ? 'Skipped' : row.action === 'Create' ? 'New' : row.action,
          skip: new FormControl({ value: !!row.skipped, disabled: blocked }, { nonNullable: true }) }));
      const subscriptions = rows.map(({ row, skip }) => skip.valueChanges.subscribe(value => {
        try {
          this.state.energyUses.skipRow(row.importedRow, value);
          this.state.error.set(undefined);
        } catch (error) {
          skip.setValue(!!row.skipped, { emitEvent: false });
          this.showError(error);
        }
      }));
      this.rows.set(rows);
      onCleanup(() => subscriptions.forEach(subscription => subscription.unsubscribe()));
    });
    effect(() => {
      const details = this.details();
      if (details && this.state.energyUses.preview()?.rows.find(row => row.importedRow === details.importedRow) !== details) {
        untracked(() => this.closeDetails());
      }
    });
    this.destroy.onDestroy(() => this.closeDetails());
  }

  review(): void {
    try {
      this.state.energyUses.review();
      this.state.error.set(undefined);
    } catch (error) {
      this.showError(error);
    }
  }

  openDetails(row: EnergyUsesImportRowPreview): void {
    if (!this.changeDetails || this.state.isNavigationBlocked()) return;
    this.closeDetails();
    this.details.set(row);
    this.detailsPortal = new TemplatePortal(this.changeDetails, this.view);
    this.modal.show(this.detailsPortal);
  }

  closeDetails(): void {
    this.details.set(undefined);
    if (this.detailsPortal && this.modal.activePortal() === this.detailsPortal) this.modal.hide();
    this.detailsPortal = undefined;
  }

  private showError(error: unknown): void {
    this.state.error.set(error instanceof Error ? error.message : String(error));
  }
}
