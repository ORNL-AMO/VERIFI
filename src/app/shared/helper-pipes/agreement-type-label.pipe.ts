import { Pipe, PipeTransform } from '@angular/core';
import { AgreementType, AgreementTypes } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Pipe({
  name: 'agreementTypeLabel'
})
export class AgreementTypeLabelPipe implements PipeTransform {

  transform(value: number): string {
    let agreementType: AgreementType = AgreementTypes.find(type => { return type.value == value });
    if (agreementType) {
      return agreementType.typeLabel;
    } else {
      return '';
    }

  }

}
