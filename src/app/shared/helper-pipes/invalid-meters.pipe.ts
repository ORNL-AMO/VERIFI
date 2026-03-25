import { Pipe, PipeTransform } from '@angular/core';
import { EditMeterFormService } from '../shared-meter-content/edit-meter-form/edit-meter-form.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Pipe({
  name: 'invalidMeters',
  standalone: false,
  pure: false
})
export class InvalidMetersPipe implements PipeTransform {

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private editMeterFormService: EditMeterFormService
  ) { }

  transform(facilityId: string): boolean {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facilityId);
    let hasInvalidMeter: boolean = facilityMeters.some(meter => {
      let meterForm = this.editMeterFormService.getFormFromMeter(meter);
      return meterForm.invalid;
    });
    return hasInvalidMeter;
  }

}
