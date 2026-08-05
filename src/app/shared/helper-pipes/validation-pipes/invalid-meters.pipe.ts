import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { isMeterInvalid } from '../../../calculations/status-check-calculations/validation/meterValidation';

@Pipe({
  name: 'invalidMeters',
  standalone: false,
  pure: false
})
export class InvalidMetersPipe implements PipeTransform {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  constructor(
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  transform(facilityId: string): boolean {
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(facilityId);
    let hasInvalidMeter: boolean = facilityMeters.some(meter => {
      return isMeterInvalid(meter);
    });
    return hasInvalidMeter;
  }

}
