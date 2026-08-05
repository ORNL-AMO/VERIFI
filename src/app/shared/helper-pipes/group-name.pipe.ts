import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';

@Pipe({
    name: 'groupName',
    standalone: false
})
export class GroupNamePipe implements PipeTransform {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService) {
  }

  transform(guid: string): string {
    let name: string = this.accountWorkspaceQuery.getMeterGroupName(guid);
    return name;
  }

}
