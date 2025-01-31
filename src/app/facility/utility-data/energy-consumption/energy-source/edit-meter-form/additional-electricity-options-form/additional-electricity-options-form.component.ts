import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AgreementType, AgreementTypes } from 'src/app/models/agreementType';

@Component({
    selector: 'app-additional-electricity-options-form',
    templateUrl: './additional-electricity-options-form.component.html',
    styleUrls: ['./additional-electricity-options-form.component.css'],
    standalone: false
})
export class AdditionalElectricityOptionsFormComponent {
  @Input()
  meterForm: FormGroup;
  @Input()
  displayIncludeEnergy: boolean;
  @Input()
  displayRetainRecs: boolean;
  @Output('emitSetIncludeEnergy')
  emitSetIncludeEnergy: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output('emitChangeAgreementType')
  emitChangeAgreementType: EventEmitter<boolean> = new EventEmitter<boolean>();

  agreementTypes: Array<AgreementType> = AgreementTypes;
  constructor() {
  }

  changeAgreementType() {
    //RECs or VPPA
    if (this.meterForm.controls.agreementType.value != 4 && this.meterForm.controls.agreementType.value != 6) {
      this.meterForm.controls.includeInEnergy.patchValue(true);
    } else {
      this.meterForm.controls.includeInEnergy.patchValue(false);
    }

    if (this.meterForm.controls.agreementType.value == 1) {
      this.meterForm.controls.retainRECs.patchValue(false);
    } else {
      this.meterForm.controls.retainRECs.patchValue(true);
    }

    if (this.meterForm.controls.agreementType.value == 2) {
      this.meterForm.controls.directConnection.patchValue(true);
    } else {
      this.meterForm.controls.directConnection.patchValue(false);
    }
    this.emitChangeAgreementType.emit(true);
  }

  setIncludeEnergy() {
    this.emitSetIncludeEnergy.emit(true);
  }
}
