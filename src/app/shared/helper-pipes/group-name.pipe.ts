import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Pipe, PipeTransform, inject } from '@angular/core';

@Pipe({
    name: 'groupName',
    standalone: false
})
export class GroupNamePipe implements PipeTransform {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);


  transform(guid: string): string {
    let name: string = this.accountWorkspaceQuery.getMeterGroupName(guid);
    return name;
  }

}
