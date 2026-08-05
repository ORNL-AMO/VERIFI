import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-utility-data',
    templateUrl: './utility-data.component.html',
    styleUrls: ['./utility-data.component.css'],
    standalone: false
})
export class UtilityDataComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService
  ) {
  }

  ngOnInit() {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }
}
