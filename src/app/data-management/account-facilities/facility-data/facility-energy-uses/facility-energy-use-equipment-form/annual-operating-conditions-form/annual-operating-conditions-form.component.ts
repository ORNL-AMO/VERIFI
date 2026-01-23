import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
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

  yearOptions: Array<{ year: number, selected: boolean }>
  showRemoveOperatingConditionsModal: boolean = false;
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
}
