import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { EnergyUsesExcelExportService } from '../../energy-uses-excel-export.service';

@Component({
  selector: 'app-export-energy-uses-modal',
  standalone: false,
  templateUrl: './export-energy-uses-modal.component.html',
  styleUrl: './export-energy-uses-modal.component.css'
})
export class ExportEnergyUsesModalComponent {
  private readonly energyExportService = inject(EnergyUsesExcelExportService);
  private readonly toastNotificationsService = inject(ToastNotificationsService);

  @Output() closeModal = new EventEmitter<void>();

  readonly exportYears = this.energyExportService.exportYears;
  readonly selectedExportYear = signal<number | null>(null);
  readonly exportData = computed(() => {
    const year = this.selectedExportYear();
    return year !== null ? this.energyExportService.prepareExportData(year) : null;
  });

  ngOnInit(): void {
    this.selectExportYear(this.exportYears()[0] ?? null);
  }

  closeExportModal(): void {
    this.closeModal.emit();
  }

  selectExportYear(year: number | null): void {
    this.selectedExportYear.set(year);
  }

  async exportEnergyUses(): Promise<void> {
    const data = this.exportData();
    if (!data || !data.rows.length) {
      return;
    }
    try {
      const blob = await this.energyExportService.createExport(data);
      this.energyExportService.download(blob, data.year);
      this.closeModal.emit();
      this.toastNotificationsService.showToast('Energy uses exported', `VERIFI-Energy-Uses-${data.year}.xlsx`, undefined, false, 'alert-success');
    } catch (error) {
      this.toastNotificationsService.showToast('Energy uses export failed', error instanceof Error ? error.message : 'The Excel file could not be exported. Please try again.',
        undefined, false, 'alert-danger');
    }
  }
}
