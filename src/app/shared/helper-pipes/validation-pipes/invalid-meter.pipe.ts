import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { isMeterInvalid } from '../../../calculations/status-check-calculations/validation/meterValidation';

@Pipe({
  name: 'invalidMeter',
  standalone: false,
  pure: false
})
export class InvalidMeterPipe implements PipeTransform {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);


  transform(meterGuid: string): boolean {
    let meter: IdbUtilityMeter = this.accountWorkspaceQuery.getMeterByGuid(meterGuid);
    return isMeterInvalid(meter);
  }
}