import { Pipe, PipeTransform } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { FormGroup } from '@angular/forms';
import { EditMeterFormService } from '../shared-meter-content/edit-meter-form/edit-meter-form.service';

@Pipe({
  name: 'invalidMeter',
  standalone: false,
  pure: false
})
export class InvalidMeterPipe implements PipeTransform {

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private editMeterFormService: EditMeterFormService
  ) { }

  transform(meterGuid: string): boolean {
    let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterGuid);
    let meterForm: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
    return meterForm.invalid;
  }
}