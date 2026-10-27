import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { EnergyUsesExcelImportService, EnergyUsesImportPreview, EnergyUsesWorkbook } from '../../energy-uses-excel-import.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';

@Component({
  selector: 'app-import-energy-uses-modal', standalone: false,
  templateUrl: './import-energy-uses-modal.component.html', styleUrl: './import-energy-uses-modal.component.css'
})
export class ImportEnergyUsesModalComponent {
  private readonly energyImportService = inject(EnergyUsesExcelImportService);
  private readonly toastNotificationsService = inject(ToastNotificationsService);
  @Output() closeModal = new EventEmitter<void>();
  readonly workbookData = signal<EnergyUsesWorkbook | null>(null);
  readonly selectedImportYear = signal<number | null>(null);
  readonly importPreview = signal<EnergyUsesImportPreview | null>(null);
  readonly expandedDetailRows = signal<ReadonlySet<number>>(new Set());
  readonly equipmentRows = computed(() => (this.importPreview()?.rows ?? []).filter(row => row.skipped || row.action !== 'Unchanged'));
  readonly skippedRowCount = computed(() => this.importPreview()?.rows.filter(row => row.skipped).length ?? 0);
  readonly hasRowErrors = computed(() => this.equipmentRows().some(row => row.errors.length > 0));

  async selectWorkbook(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];
    if (!selectedFile) {
      return;
    }
    fileInput.value = '';
    this.workbookData.set(null);
    this.importPreview.set(null);
    this.selectedImportYear.set(null);
    try {
      const workbookData = await this.energyImportService.readFile(selectedFile);
      this.workbookData.set(workbookData);
      this.selectedImportYear.set(workbookData.year);
    } catch (error) {
      this.showImportError(error);
    }
  }

  selectImportYear(year: number | null): void {
    this.selectedImportYear.set(year);
    this.importPreview.set(null);
  }

  reviewImport(): void {
    if (!this.workbookData() || this.selectedImportYear() == null || this.importPreview()) { 
      return; 
    }
    try {
      this.importPreview.set(this.energyImportService.preparePreview(this.workbookData(), this.selectedImportYear()));
      this.expandedDetailRows.set(new Set());
    } catch (error) { 
      this.showImportError(error); 
    }
  }

  toggleSkipRow(excelRow: number, event: Event): void {
    const currentPreview = this.importPreview();
    if (!currentPreview) { 
      return; 
    }
    const skippedExcelRows = new Set(currentPreview.rows.filter(row => row.skipped).map(row => row.importedRow));
    if ((event.target as HTMLInputElement).checked) { 
      skippedExcelRows.add(excelRow); 
    }
    else { 
      skippedExcelRows.delete(excelRow); 
    }
    try {
      const updatedPreview = this.energyImportService.preparePreview(this.workbookData(), this.selectedImportYear(), skippedExcelRows);
      if (updatedPreview.accountGuid !== currentPreview.accountGuid || updatedPreview.revision !== currentPreview.revision) {
        this.importPreview.set({ ...currentPreview, canImport: false });
        throw new Error('Account data changed since this preview. Cancel and reopen Import to review it again.');
      }
      this.importPreview.set(updatedPreview);
    } catch (error) {
      (event.target as HTMLInputElement).checked = !!currentPreview.rows.find(row => row.importedRow === excelRow)?.skipped;
      this.showImportError(error);
    }
  }

  toggleRowDetails(excelRow: number): void {
    const expandedRows = new Set(this.expandedDetailRows());
    if (expandedRows.has(excelRow)) { 
      expandedRows.delete(excelRow); 
    }
    else { 
      expandedRows.add(excelRow); 
    }
    this.expandedDetailRows.set(expandedRows);
  }

  closeImportModal(): void {
    this.closeModal.emit();
  }

  async importEnergyUses(): Promise<void> {
    const importPreview = this.importPreview();
    if (!importPreview?.canImport) { 
      return; 
    }
    this.importPreview.set(null);
    this.closeImportModal();
    try {
      await this.energyImportService.apply(importPreview);
      this.toastNotificationsService.showToast('Energy uses imported',
        'Energy uses imported successfully!',
        undefined, false, 'alert-success');
    } catch {
      this.showImportError();
    }
  }

  private showImportError(error?: unknown): void {
    this.toastNotificationsService.showToast('Energy uses import failed', error instanceof Error ? error.message : 'The workbook could not be imported. Please try again.',
      undefined, false, 'alert-danger');
  }
}
