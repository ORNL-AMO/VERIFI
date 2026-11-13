import { Component, DestroyRef, EventEmitter, OnInit, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesExcelExportService, getEnergyUsesExportYears } from '@shared/energy-uses-excel/energy-uses-excel-export.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';

@Component({
  selector: 'app-export-energy-uses', standalone: false,
  templateUrl: './export-energy-uses.component.html', styleUrls: ['./export-energy-uses.component.css']
})
export class ExportEnergyUsesComponent implements OnInit {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly exporter = inject(EnergyUsesExcelExportService);
  private readonly edits = inject(UnsavedChangesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroy = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid;
  private controller?: AbortController;
  readonly initialFacilityGuid = input<string | undefined>();
  @Output() closed = new EventEmitter<void>();
  readonly facilities = computed(() => this.workspace.facilities().filter(facility => facility.accountId === this.accountGuid));
  readonly facilityControls = new FormRecord<FormControl<boolean>>({});
  readonly selection = toSignal(this.facilityControls.valueChanges, { initialValue: this.facilityControls.value });
  readonly year = new FormControl<number | null>(null);
  private readonly selectedYear = toSignal(this.year.valueChanges, { initialValue: null });
  readonly selectedFacilities = computed(() => new Set(Object.entries(this.selection()).filter(([, selected]) => selected).map(([guid]) => guid)));
  readonly years = computed(() => getEnergyUsesExportYears(this.workspace.energyUseEquipment().filter(item => this.selectedFacilities().has(item.facilityId))));
  readonly facilityRows = computed(() => this.facilities().map(facility => ({ facility, control: this.facilityControls.controls[facility.guid] })));
  readonly data = computed(() => this.selectedYear() === null ? undefined : this.exporter.prepareExportData(this.selectedYear(), this.selectedFacilities()));
  readonly saving = signal(false);
  readonly error = signal('');
  readonly available = computed(() => this.workspace.isReady() && this.workspace.account()?.guid === this.accountGuid && !this.workspace.hasPending());
  readonly canExport = computed(() => this.available() && !this.saving() && !!this.data()?.rows.length && !this.data()?.hasExcessUtilityTypes);

  constructor() {
    effect(() => {
      const years = this.years();
      if (!years.includes(this.selectedYear())) this.year.setValue(years.at(-1) ?? null);
    });
    effect(() => {
      if (this.saving()) {
        this.year.disable({ emitEvent: false });
        this.facilityControls.disable({ emitEvent: false });
      } else {
        this.year.enable({ emitEvent: false });
        this.facilityControls.enable({ emitEvent: false });
      }
    });
    effect(() => {
      if (this.workspace.account()?.guid !== this.accountGuid || this.workspace.isSwitching()) {
        this.controller?.abort();
        this.closed.emit();
      }
    });
    this.destroy.onDestroy(() => this.controller?.abort());
  }

  ngOnInit(): void {
    const initial = this.initialFacilityGuid();
    for (const facility of this.facilities()) {
      this.facilityControls.addControl(facility.guid, new FormControl(!initial || facility.guid === initial, { nonNullable: true }), { emitEvent: false });
    }
    this.facilityControls.updateValueAndValidity();
  }

  async export(): Promise<void> {
    if (!this.canExport()) return;
    const controller = new AbortController();
    this.controller = controller;
    this.saving.set(true);
    this.error.set('');
    try {
      if (!await this.edits.flushPendingChanges() || this.edits.hasUnsavedChanges() || !this.available()) {
        throw new Error('Finish saving or resolve pending edits before exporting.');
      }
      // Freeze committed rows after the save gate; generating the workbook never reads live drafts.
      const data = structuredClone(this.data());
      if (!data?.rows.length) throw new Error('Select facilities and a year with saved annual data.');
      const blob = await this.exporter.createExport(data, controller.signal);
      controller.signal.throwIfAborted();
      if (this.workspace.account()?.guid !== this.accountGuid || this.destroy.destroyed) return;
      this.exporter.download(blob, data.year);
      this.notifications.success('Energy Uses download started.');
      this.closed.emit();
    } catch (error) {
      if (!controller.signal.aborted) this.error.set(error instanceof Error ? error.message : 'The workbook could not be exported. Try again.');
    } finally {
      this.saving.set(false);
      this.controller = undefined;
    }
  }
}
