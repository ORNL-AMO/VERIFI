import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-account-home-help',
    templateUrl: './account-home-help.component.html',
    styleUrls: ['./account-home-help.component.css'],
    standalone: false
})
export class AccountHomeHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });
  }

  ngOnDestroy(){
    this.selectedAccountSub.unsubscribe();
  }
}
