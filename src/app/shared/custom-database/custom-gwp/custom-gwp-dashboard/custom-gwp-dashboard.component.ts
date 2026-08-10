import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { CustomDataCommandHandler } from 'src/app/account-workspace/handlers/custom-data-command-handler.service';
import { deleteWorkspaceRecords } from 'src/app/account-workspace/account-workspace-patches';
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
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly customDataHandler = inject(CustomDataCommandHandler);

  customGWPs: Array<IdbCustomGWP>;
  customGWPsSub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  itemToDelete: IdbCustomGWP;
  deleteGWPInUse: boolean = false;
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.customGWPsSub = toObservable(computed(() => [...this.accountWorkspaceStore.customGWPs()]), { injector: this.injector }).subscribe(val => {
      this.customGWPs = val;
    });

    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
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
    await this.commandBoundary.execute(
      {
        entityKind: 'customGWP',
        changeKind: 'delete',
        entityGuid: this.itemToDelete.guid,
        label: 'Deleting custom GWP',
        publication: {
          mode: 'patch',
          buildPatch: value => deleteWorkspaceRecords('customGWPs', { ids: [value] })
        }
      },
      () => this.customDataHandler.deleteCustomGWP(this.itemToDelete, this.accountWorkspaceStore.account()?.guid)
    );
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
