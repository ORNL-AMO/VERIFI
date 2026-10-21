import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { MeterSource } from '@data/models/constantsAndTypes';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { EnergyUsesExcelExportService, EnergyUsesUtilitySelections } from '../../energy-uses-excel-export.service';

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
  readonly utilitySelections = signal<EnergyUsesUtilitySelections>({});
  readonly exportData = computed(() => {
    const year = this.selectedExportYear();
    return year !== null ? this.energyExportService.prepareExportData(year, this.utilitySelections()) : null;
  });

  ngOnInit(): void {
    this.selectExportYear(this.exportYears()[0] ?? null);
  }

  closeExportModal(): void {
    this.closeModal.emit();
  }

  selectExportYear(year: number | null): void {
    this.selectedExportYear.set(year);
    this.utilitySelections.set({});
  }

  toggleExportUtility(equipmentGuid: string, source: MeterSource, checked: boolean): void {
    this.utilitySelections.update(selections => {
      const selected = selections[equipmentGuid] ?? [];
      if (checked && (selected.length >= 2 || selected.includes(source))) {
        return selections;
      }
      return { ...selections, [equipmentGuid]: checked ? [...selected, source] : selected.filter(value => value !== source) };
    });
  }

  async exportEnergyUses(): Promise<void> {
    const data = this.exportData();
    if (!data || data.needsUtilitySelection || !data.rows.length) {
      return;
    }
    try {
      const blob = await this.energyExportService.createExport(data);
      this.energyExportService.download(blob, data.year);
      this.closeModal.emit();
      this.toastNotificationsService.showToast('Energy uses exported', `VERIFI-Energy-Uses-${data.year}.xlsx`, undefined, false, 'alert-success');
    } catch (error) {
      this.toastNotificationsService.showToast('Energy uses export failed', 'The Excel file could not be exported. Please try again.',
        undefined, false, 'alert-danger');
    }
  }
}
