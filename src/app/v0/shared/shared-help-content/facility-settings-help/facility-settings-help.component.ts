import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { IdbAccount } from '@data/models/idbModels/account';

@Component({
    selector: 'app-facility-settings-help',
    templateUrl: './facility-settings-help.component.html',
    styleUrls: ['./facility-settings-help.component.css'],
    standalone: false
})
export class FacilitySettingsHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

    account: IdbAccount;


    ngOnInit(){
        this.account = this.accountWorkspaceStore.account();
    }
}
