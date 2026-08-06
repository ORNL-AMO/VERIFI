import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-custom-fuel-data-dashboard',
  templateUrl: './custom-fuel-data-dashboard.component.html',
  styleUrls: ['./custom-fuel-data-dashboard.component.css'],
  standalone: false
})
export class CustomFuelDataDashboardComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  customFuels: Array<IdbCustomFuel>;
  customFuelsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  itemToDelete: IdbCustomFuel;
  deleteFuelInUse: boolean = false;
  constructor(
    private customFuelDbService: CustomFuelDbService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.customFuelsSub = toObservable(computed(() => [...this.accountWorkspaceStore.customFuels()]), { injector: this.injector }).subscribe(val => {
      this.customFuels = val;
    });

    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
      this.selectedAccount = val;
    });
  }

  ngOnDestroy() {
    this.customFuelsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  addNewItem() {
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./add'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../add'], { relativeTo: this.activatedRoute });
    }
  }

  deleteItem(customFuel: IdbCustomFuel) {
    this.itemToDelete = customFuel;
    this.setDeleteFuelInUse();
  }

  editItem(customFuel: IdbCustomFuel) {
    if (this.router.url.includes('data-management')) {
      this.router.navigate(['./edit', customFuel.guid], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../edit', customFuel.guid], { relativeTo: this.activatedRoute });
    }
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await firstValueFrom(this.customFuelDbService.deleteWithObservable(this.itemToDelete.id));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.cancelDelete();
  }

  setDeleteFuelInUse() {
    if (this.itemToDelete) {
      let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
      let fuelMeter: IdbUtilityMeter = accountMeters.find(meter => {
        if (meter.scope != 2) {
          return meter.fuel == this.itemToDelete.value
        } else {
          return meter.vehicleFuel == this.itemToDelete.value
        }
      });
      this.deleteFuelInUse = (fuelMeter != undefined);
    } else {
      this.deleteFuelInUse = false;
    }
  }
}
