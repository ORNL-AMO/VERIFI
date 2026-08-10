import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { CustomDataCommandHandler } from 'src/app/account-workspace/handlers/custom-data-command-handler.service';
import { deleteWorkspaceRecords } from 'src/app/account-workspace/account-workspace-patches';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly customDataHandler = inject(CustomDataCommandHandler);

  customFuels: Array<IdbCustomFuel>;
  customFuelsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  itemToDelete: IdbCustomFuel;
  deleteFuelInUse: boolean = false;
  constructor(
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
    await this.commandBoundary.execute(
      {
        entityKind: 'customFuel',
        changeKind: 'delete',
        entityGuid: this.itemToDelete.guid,
        label: 'Deleting custom fuel',
        publication: {
          mode: 'patch',
          buildPatch: value => deleteWorkspaceRecords('customFuels', { ids: [value] })
        }
      },
      () => this.customDataHandler.deleteCustomFuel(this.itemToDelete, this.accountWorkspaceStore.account()?.guid)
    );
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
