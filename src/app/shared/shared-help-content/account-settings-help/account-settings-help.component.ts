import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { IdbAccount } from '@data/models/idbModels/account';

@Component({
    selector: 'app-account-settings-help',
    templateUrl: './account-settings-help.component.html',
    styleUrls: ['./account-settings-help.component.css'],
    standalone: false
})
export class AccountSettingsHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

    account: IdbAccount;


    ngOnInit(): void {
        this.account = this.accountWorkspaceStore.account();
    }
}
