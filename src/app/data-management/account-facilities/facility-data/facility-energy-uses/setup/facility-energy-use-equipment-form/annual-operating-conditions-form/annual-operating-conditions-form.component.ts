import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-annual-operating-conditions-form',
  standalone: false,
  templateUrl: './annual-operating-conditions-form.component.html',
  styleUrl: './annual-operating-conditions-form.component.css',
})
export class AnnualOperatingConditionsFormComponent {
  @Input({ required: true })
  annualOperatingConditionsDataForm: FormGroup;
  @Output()
  emitRemoveOperatingConditionsData: EventEmitter<void> = new EventEmitter<void>();
  @Input()
  inSetup: boolean = false;

  showRemoveOperatingConditionsModal: boolean = false;
  showCalculateHoursOfOperationModal: boolean = false;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit() {
  }

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
    this.annualOperatingConditionsDataForm.controls.hoursOfOperation.setValue(calculatedHoursPerYear);
    this.annualOperatingConditionsDataForm.controls.hoursPerDay.setValue(hoursPerDay);
    this.annualOperatingConditionsDataForm.controls.daysPerWeek.setValue(daysPerWeek);
    this.annualOperatingConditionsDataForm.controls.weeksPerYear.setValue(weeksPerYear);
  }
}
