import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-facility-settings-help',
    templateUrl: './facility-settings-help.component.html',
    styleUrls: ['./facility-settings-help.component.css'],
    standalone: false
})
export class FacilitySettingsHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

    account: IdbAccount;

    constructor(private accountDbService: AccountdbService) {}

    ngOnInit(){
        this.account = this.accountWorkspaceStore.account();
    }
}
