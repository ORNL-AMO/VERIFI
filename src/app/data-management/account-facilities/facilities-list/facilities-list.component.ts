import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { FACILITY_DELETION_MESSAGES } from 'src/app/indexedDB/facility-deletion.config';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-facilities-list',
  templateUrl: './facilities-list.component.html',
  styleUrl: './facilities-list.component.css',
  standalone: false
})
export class FacilitiesListComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  modalOpen: boolean;
  modalOpenSub: Subscription;

  numberOfFacilities: number = 1;
  orderOptions: Array<number> = [];
  facilityToDelete: IdbFacility;
  displayAddFacilityModal: boolean = false;
  loadingSub: Subscription;
  constructor(
    private sharedDataService: SharedDataService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private loadingService: LoadingService,
    private commandBoundary: WorkspaceCommandBoundary,
    private facilityHandler: FacilityCommandHandler,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.facilitiesSub = toObservable(this.accountWorkspaceStore.facilities, { injector: this.injector }).subscribe(val => {
      this.facilities = val.map(facility => ({ ...facility }));
      this.setOrderOptions();
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'delete-facility') {
        this.showFacilityDeletionToast();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  showFacilityDeletionToast() {
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, 'alert-success');
  }

  async addFacility() {
    this.loadingService.setLoadingStatus(true);
    const selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    for (let i = 0; i < this.numberOfFacilities; i++) {
      this.loadingService.setLoadingMessage('Creating Facility ' + (i + 1) + '...');
      const idbFacility: IdbFacility = getNewIdbFacility(selectedAccount);
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'add', label: 'Adding facility' },
        () => this.facilityHandler.add(
          idbFacility,
          selectedAccount.guid,
          this.accountWorkspaceStore.accountAnalyses(),
          this.accountWorkspaceStore.accountReports()
        )
      );
    }
    this.loadingService.setLoadingStatus(false);
    if (this.numberOfFacilities > 1) {
      this.toastNotificationService.showToast(this.numberOfFacilities + ' Facilities Added!', undefined, undefined, false, 'alert-success');
    } else {
      this.toastNotificationService.showToast('New Facility Added!', undefined, undefined, false, 'alert-success');
    }
    this.cancelAddFacilities();
  }

  goBack() {

  }

  next() {

  }

  openAddFacilityModal() {
    this.displayAddFacilityModal = true;
  }

  cancelAddFacilities() {
    this.displayAddFacilityModal = false;
  }

  setDeleteFacility(facility: IdbFacility) {
    this.facilityToDelete = facility;
  }

  cancelFacilityDelete() {
    this.facilityToDelete = undefined;
  }

  async confirmDeleteFacility() {
    const facilityToDelete: IdbFacility = this.facilityToDelete;
    this.cancelFacilityDelete();
    const selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    for (const message of FACILITY_DELETION_MESSAGES) {
      this.loadingService.addLoadingMessage(message);
    }
    this.loadingService.setContext('delete-facility');
    this.loadingService.setTitle('Deleting Facility');
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'delete', entityGuid: facilityToDelete.guid, label: 'Deleting facility' },
      () => this.facilityHandler.delete(facilityToDelete, selectedAccount.guid, phase => {
        this.loadingService.setCurrentLoadingIndex(phase.index);
      })
    );
    this.loadingService.isLoadingComplete.next(true);
  }

  goToFacility(facility: IdbFacility) {
    this.router.navigateByUrl('/data-management/' + facility.accountId + '/facilities/' + facility.guid);
  }

  setOrderOptions() {
    let orderOptions: Array<number> = new Array();
    let index: number = 1;
    this.facilities.forEach(() => {
      orderOptions.push(index);
      index++;
    })
    this.orderOptions = orderOptions;
  }

  async setFacilityOrder(facility: IdbFacility) {
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'update', entityGuid: facility.guid, label: 'Updating facility order' },
      () => this.facilityHandler.update(facility, activeAccountGuid)
    );
    for (const other of this.facilities) {
      if (other.guid !== facility.guid && other.facilityOrder === facility.facilityOrder) {
        const cleared = { ...other, facilityOrder: undefined };
        await this.commandBoundary.execute(
          { entityKind: 'facility', changeKind: 'update', entityGuid: other.guid, label: 'Updating facility order' },
          () => this.facilityHandler.update(cleared, activeAccountGuid)
        );
      }
    }
  }

  goToUploadData() {
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data/upload-files');
  }
}
