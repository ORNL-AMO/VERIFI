import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbAccount, IdbCustomFuel } from 'src/app/models/idb';

@Component({
  selector: 'app-custom-fuel-data-dashboard',
  templateUrl: './custom-fuel-data-dashboard.component.html',
  styleUrls: ['./custom-fuel-data-dashboard.component.css']
})
export class CustomFuelDataDashboardComponent {

  customFuels: Array<IdbCustomFuel>;
  customFuelsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private customFuelDbService: CustomFuelDbService, private router: Router,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.customFuelsSub = this.customFuelDbService.accountCustomFuels.subscribe(val => {
      this.customFuels = val;
    });

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });
  }

  ngOnDestroy() {
    this.customFuelsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }


  addNewItem() {
    this.router.navigateByUrl('account/custom-data/fuels/add');
  }

  deleteItem(customFuel: IdbCustomFuel) {
    //TODO...
  }

  editItem(customFuel: IdbCustomFuel) {
    this.router.navigateByUrl('account/custom-data/fuels/edit/' + customFuel.guid);
  }
}
