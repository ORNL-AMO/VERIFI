import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, computed, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { CustomDataCommandHandler } from 'src/app/account-workspace/handlers/custom-data-command-handler.service';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly customDataHandler = inject(CustomDataCommandHandler);

  customEmissionsItems: Array<IdbCustomEmissionsItem>;
  customEmissionsItemsSub: Subscription;
  itemToDelete: IdbCustomEmissionsItem;
  deleteItemInUse: boolean = false;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.customEmissionsItemsSub = toObservable(computed(() => [...this.accountWorkspaceStore.customEmissions()]), { injector: this.injector }).subscribe(val => {
      this.customEmissionsItems = val;
    });

    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
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
        let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
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
    await this.commandBoundary.execute(
      { entityKind: 'customEmissions', changeKind: 'delete', entityGuid: this.itemToDelete.guid, label: 'Deleting custom emissions' },
      () => this.customDataHandler.deleteCustomEmissions(this.itemToDelete, this.accountWorkspaceStore.account()?.guid)
    );
    this.cancelDelete();
  }
}
