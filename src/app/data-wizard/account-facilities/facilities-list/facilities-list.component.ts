import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-facilities-list',
  templateUrl: './facilities-list.component.html',
  styleUrl: './facilities-list.component.css',
  standalone: false
})
export class FacilitiesListComponent {
  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  modalOpen: boolean;
  modalOpenSub: Subscription;

  numberOfFacilities: number = 1;
  orderOptions: Array<number> = [];
  facilityToDelete: IdbFacility;
  displayAddFacilityModal: boolean = false;
  constructor(private sharedDataService: SharedDataService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilities = val;
      this.setOrderOptions();
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  async addFacility() {
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.numberOfFacilities; i++) {
      this.loadingService.setLoadingMessage('Creating Facility ' + (i + 1) + '...');
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let idbFacility: IdbFacility = getNewIdbFacility(selectedAccount);
      let newFacility: IdbFacility = await firstValueFrom(this.facilityDbService.addWithObservable(idbFacility));
      await this.dbChangesService.updateDataNewFacility(newFacility);
      await this.dbChangesService.selectAccount(selectedAccount, false);
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
    let facilityToDelete: IdbFacility = this.facilityToDelete;
    this.cancelFacilityDelete();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.deleteFacility(facilityToDelete, selectedAccount);
  }

  goToFacility(facility: IdbFacility) {
    this.router.navigateByUrl('/data-wizard/' + facility.accountId + '/facilities/' + facility.guid);
  }

  setOrderOptions() {
    let orderOptions: Array<number> = new Array();
    let index: number = 1;
    this.facilities.forEach(item => {
      orderOptions.push(index);
      index++;
    })
    this.orderOptions = orderOptions;
  }

  async setFacilityOrder(facility: IdbFacility) {
    await this.dbChangesService.updateFacilities(facility, false);
    for (let i = 0; i < this.facilities.length; i++) {
      if (this.facilities[i].guid != facility.guid) {
        if (this.facilities[i].facilityOrder && this.facilities[i].facilityOrder == facility.facilityOrder) {
          this.facilities[i].facilityOrder = undefined;
          await this.dbChangesService.updateFacilities(this.facilities[i], false);
        }
      }
    };
  }

  goToUploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + selectedAccount.guid + '/import-data/upload-files');
  }
}
