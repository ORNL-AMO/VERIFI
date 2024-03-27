import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbCustomGWP, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-custom-gwp-dashboard',
  templateUrl: './custom-gwp-dashboard.component.html',
  styleUrls: ['./custom-gwp-dashboard.component.css']
})
export class CustomGwpDashboardComponent {

  customGWPs: Array<IdbCustomGWP>;
  customGWPsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  itemToDelete: IdbCustomGWP;
  deleteGWPInUse: boolean = false;
  constructor(private customGWPDbService: CustomGWPDbService, private router: Router,
    private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.customGWPsSub = this.customGWPDbService.accountCustomGWPs.subscribe(val => {
      this.customGWPs = val;
    });

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });
  }

  ngOnDestroy() {
    this.customGWPsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }


  addNewItem() {
    this.router.navigateByUrl('account/custom-data/gwp/add');
  }

  deleteItem(customGWP: IdbCustomGWP) {
    this.itemToDelete = customGWP;
    this.setDeleteGWPInUse();
  }

  editItem(customGWP: IdbCustomGWP) {
    this.router.navigateByUrl('account/custom-data/gwp/edit/' + customGWP.guid);
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await firstValueFrom(this.customGWPDbService.deleteWithObservable(this.itemToDelete.id));
    let allFuels: Array<IdbCustomGWP> = await firstValueFrom(this.customGWPDbService.getAll());
    let accountCustomGWPs: Array<IdbCustomGWP> = allFuels.filter(fuel => { return fuel.accountId == this.selectedAccount.guid });
    this.customGWPDbService.accountCustomGWPs.next(accountCustomGWPs);
    this.cancelDelete();
  }

  setDeleteGWPInUse() {
    if (this.itemToDelete) {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      let gwpMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.globalWarmingPotentialOption == this.itemToDelete.value });
      this.deleteGWPInUse = (gwpMeter != undefined);
    } else {
      this.deleteGWPInUse = false;
    }
  }
}
