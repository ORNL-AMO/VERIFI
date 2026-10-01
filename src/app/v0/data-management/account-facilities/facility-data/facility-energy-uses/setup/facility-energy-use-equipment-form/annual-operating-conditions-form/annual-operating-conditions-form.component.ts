import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-annual-operating-conditions-form',
  standalone: false,
  templateUrl: './annual-operating-conditions-form.component.html',
  styleUrl: './annual-operating-conditions-form.component.css',
})
export class AnnualOperatingConditionsFormComponent {
  annualOperatingConditionsDataForm = input.required<FormGroup>();
  @Output()
  emitRemoveOperatingConditionsData: EventEmitter<void> = new EventEmitter<void>();
  inSetup = input(false);
  hasElectricityUtility = input.required<boolean>();

  showRemoveOperatingConditionsModal: boolean = false;
  showCalculateHoursOfOperationModal: boolean = false;

  openRemoveOperatingConditionsModal() {
    this.showRemoveOperatingConditionsModal = true;
  }

  closeRemoveOperatingConditionsModal() {
    this.showRemoveOperatingConditionsModal = false;
  }

  confirmRemoveOperatingConditionsData() {
    this.closeRemoveOperatingConditionsModal();
    this.emitRemoveOperatingConditionsData.emit();
  }

  openCalculateHoursOfOperationModal() {
    this.showCalculateHoursOfOperationModal = true;
  }

  closeCalculateHoursOfOperationModal() {
    this.showCalculateHoursOfOperationModal = false;
  }

  handleCalculatedValues({ calculatedHoursPerYear, hoursPerDay, daysPerWeek, weeksPerYear }: { calculatedHoursPerYear: number, hoursPerDay: number, daysPerWeek: number, weeksPerYear: number }) {
    const annualOperatingConditionsDataForm = this.annualOperatingConditionsDataForm();
    annualOperatingConditionsDataForm.controls.hoursOfOperation.setValue(calculatedHoursPerYear);
    annualOperatingConditionsDataForm.controls.hoursPerDay.setValue(hoursPerDay);
    annualOperatingConditionsDataForm.controls.daysPerWeek.setValue(daysPerWeek);
    annualOperatingConditionsDataForm.controls.weeksPerYear.setValue(weeksPerYear);
  }
}
