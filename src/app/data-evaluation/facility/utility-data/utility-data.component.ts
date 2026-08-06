import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-utility-data',
    templateUrl: './utility-data.component.html',
    styleUrls: ['./utility-data.component.css'],
    standalone: false
})
export class UtilityDataComponent implements OnInit {
  constructor(private injector: Injector) { }

  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;

  ngOnInit() {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }
}
