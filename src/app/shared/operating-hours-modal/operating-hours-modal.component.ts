import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-operating-hours-modal',
  standalone: false,
  templateUrl: './operating-hours-modal.component.html',
  styleUrl: './operating-hours-modal.component.css',
})
export class OperatingHoursModalComponent {

  @Input()
  year: number;
  @Input()
  hoursPerDay: number;
  @Input()
  daysPerWeek: number;
  @Input()
  weeksPerYear: number;

  showCalculateHoursOfOperationModal: boolean = true;

  @Output()
  saveCalculatedHoursPerYear: EventEmitter<{ calculatedHoursPerYear: number, hoursPerDay: number, daysPerWeek: number, weeksPerYear: number }> = new EventEmitter<{ calculatedHoursPerYear: number, hoursPerDay: number, daysPerWeek: number, weeksPerYear: number }>();
  @Output()
  closeModal: EventEmitter<undefined> = new EventEmitter<undefined>();

  ngOnInit() {
    if (this.hoursPerDay == null) {
      this.hoursPerDay = 24;
    }
    if (this.daysPerWeek == null) {
      this.daysPerWeek = 7;
    }
    if (this.weeksPerYear == null) {
      this.weeksPerYear = 52;
    }
  }

  get calculatedHoursPerYear(): number {
    if (this.hoursPerDay > 0 && this.daysPerWeek > 0 && this.weeksPerYear > 0) {
      return Math.ceil(this.hoursPerDay * this.daysPerWeek * this.weeksPerYear);
    }
    return 0;
  }

  get isDisabled(): boolean {
    if (this.hoursPerDay == null || this.daysPerWeek == null || this.weeksPerYear == null) {
      return true;
    }

    if (this.hoursPerDay < 0 || this.hoursPerDay > 24 || this.daysPerWeek < 0 || this.daysPerWeek > 7 || this.weeksPerYear < 0 || this.weeksPerYear > 52) {
      return true;
    }
    return false;
  }

  closeCalculateHoursOfOperationModal() {
    this.closeModal.emit(undefined);
  }

  save() {
    this.saveCalculatedHoursPerYear.emit({
      calculatedHoursPerYear: this.calculatedHoursPerYear,
      hoursPerDay: this.hoursPerDay, daysPerWeek: this.daysPerWeek, weeksPerYear: this.weeksPerYear
    });
    this.closeCalculateHoursOfOperationModal();
  }
}
