import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbCustomEmissionsItem, IdbFacility } from 'src/app/models/idb';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-emissions-data-dashboard',
  templateUrl: './emissions-data-dashboard.component.html',
  styleUrls: ['./emissions-data-dashboard.component.css']
})
export class EmissionsDataDashboardComponent implements OnInit {

  customEmissionsItems: Array<IdbCustomEmissionsItem>;
  customEmissionsItemsSub: Subscription;
  itemToDelete: IdbCustomEmissionsItem;
  deleteItemInUse: boolean = false;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private customEmissionsDbService: CustomEmissionsDbService,
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.customEmissionsItemsSub = this.customEmissionsDbService.accountEmissionsItems.subscribe(val => {
      this.customEmissionsItems = val;
    });

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });
  }

  ngOnDestroy() {
    this.customEmissionsItemsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  addNewItem() {
    this.router.navigateByUrl('account/custom-data/emissions/add');
  }

  deleteItem(customEmissionsItem: IdbCustomEmissionsItem) {
    this.itemToDelete = customEmissionsItem;
    this.setDeleteItemInUse();
  }

  editItem(customEmissionsItem: IdbCustomEmissionsItem) {
    this.router.navigateByUrl('account/custom-data/emissions/edit/' + customEmissionsItem.guid);
  }

  setDeleteItemInUse() {
    if (this.itemToDelete) {
      this.deleteItemInUse = (this.itemToDelete.subregion == this.selectedAccount.eGridSubregion);
      if (!this.deleteItemInUse) {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        facilities.forEach(facility => {
          if (this.itemToDelete.subregion == facility.eGridSubregion) {
            this.deleteItemInUse = true;
          }
        });
      }
    } else {
      this.deleteItemInUse = false;
    }
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await firstValueFrom(this.customEmissionsDbService.deleteWithObservable(this.itemToDelete.id));
    let allEmissions: Array<IdbCustomEmissionsItem> = await firstValueFrom(this.customEmissionsDbService.getAll());
    let accountEmissions: Array<IdbCustomEmissionsItem> = allEmissions.filter(fuel => { return fuel.accountId == this.selectedAccount.guid });
    this.customEmissionsDbService.accountEmissionsItems.next(accountEmissions);
    this.cancelDelete();
  }
}
