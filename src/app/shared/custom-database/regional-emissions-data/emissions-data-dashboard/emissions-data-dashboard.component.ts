import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-emissions-data-dashboard',
    templateUrl: './emissions-data-dashboard.component.html',
    styleUrls: ['./emissions-data-dashboard.component.css'],
    standalone: false
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
    private facilityDbService: FacilitydbService,
    private activatedRoute: ActivatedRoute) { }

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
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./add'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../add'], { relativeTo: this.activatedRoute });
    }
  }

  deleteItem(customEmissionsItem: IdbCustomEmissionsItem) {
    this.itemToDelete = customEmissionsItem;
    this.setDeleteItemInUse();
  }

  editItem(customEmissionsItem: IdbCustomEmissionsItem) {
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./edit', customEmissionsItem.guid], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../edit', customEmissionsItem.guid], { relativeTo: this.activatedRoute });
    }
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
