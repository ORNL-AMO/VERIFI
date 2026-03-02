import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-account-custom-data-help',
    templateUrl: './account-custom-data-help.component.html',
    styleUrls: ['./account-custom-data-help.component.css'],
    standalone: false
})
export class AccountCustomDataHelpComponent {

    account: IdbAccount;

    constructor(private accountDbService: AccountdbService) { }

    ngOnInit(): void {
        this.account = this.accountDbService.selectedAccount.getValue();
    }
}
