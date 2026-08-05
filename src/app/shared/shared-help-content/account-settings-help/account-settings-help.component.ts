import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-account-settings-help',
    templateUrl: './account-settings-help.component.html',
    styleUrls: ['./account-settings-help.component.css'],
    standalone: false
})
export class AccountSettingsHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

    account: IdbAccount;

    constructor(private accountDbService: AccountdbService) { }

    ngOnInit(): void {
        this.account = this.accountWorkspaceStore.account();
    }
}
