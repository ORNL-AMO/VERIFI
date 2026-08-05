import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-custom-gwp-dashboard',
  templateUrl: './custom-gwp-dashboard.component.html',
  styleUrls: ['./custom-gwp-dashboard.component.css'],
  standalone: false
})
export class CustomGwpDashboardComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  customGWPs: Array<IdbCustomGWP>;
  customGWPsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  itemToDelete: IdbCustomGWP;
  deleteGWPInUse: boolean = false;
  constructor(private customGWPDbService: CustomGWPDbService, private router: Router,
    private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {
    this.customGWPsSub = this.customGWPDbService.accountCustomGWPs.subscribe(val => {
      this.customGWPs = val;
    });

    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(val => {
      this.selectedAccount = val;
    });
  }

  ngOnDestroy() {
    this.customGWPsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  addNewItem() {
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./add'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../add'], { relativeTo: this.activatedRoute });
    }
  }

  deleteItem(customGWP: IdbCustomGWP) {
    this.itemToDelete = customGWP;
    this.setDeleteGWPInUse();
  }

  editItem(customGWP: IdbCustomGWP) {
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./edit', customGWP.guid], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../edit', customGWP.guid], { relativeTo: this.activatedRoute });
    }
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
      let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
      let gwpMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.globalWarmingPotentialOption == this.itemToDelete.value });
      this.deleteGWPInUse = (gwpMeter != undefined);
    } else {
      this.deleteGWPInUse = false;
    }
  }
}
