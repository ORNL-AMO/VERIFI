import { Component, HostListener } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, updateMeterDataCharges } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-meter',
  templateUrl: './facility-meter.component.html',
  styleUrl: './facility-meter.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class FacilityMeterComponent {

  facility: IdbFacility;
  facilitySub: Subscription;


  utilityMeter: IdbUtilityMeter;
  meterForm: FormGroup;
  showDeleteMeter: boolean = false;

  async handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.meterForm.invalid && !this.meterForm.pristine) {
        await this.saveChanges();
      }
    }
  }
  
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private editMeterFormService: EditMeterFormService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private router: Router,
    private sharedDataService: SharedDataService,
    private toastNotificationsService: ToastNotificationsService,
    private loadingService: LoadingService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private toastNotificationService: ToastNotificationsService,
    private routerGuardService: RouterGuardService
  ) {

  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      if (this.utilityMeter) {
        this.utilityMeterDbService.selectedMeter.next(this.utilityMeter);
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.utilityMeter);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.utilityMeterDbService.selectedMeter.next(undefined);
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.meterForm.markAsPristine();
    this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.utilityMeter.guid);
    this.utilityMeter = this.editMeterFormService.updateMeterFromForm(this.utilityMeter, this.meterForm);
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.utilityMeter));
    await this.updateMeterData(this.utilityMeter);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
  }

  async updateMeterData(meter: IdbUtilityMeter) {
    this.loadingService.setLoadingMessage('Updating Meter Data...')
    this.loadingService.setLoadingStatus(true);
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
    let dataNeedsUpdate: Array<IdbUtilityMeterData> = updateMeterDataCharges(meter, meterData);
    if (dataNeedsUpdate.length > 0) {
      for (let i = 0; i < dataNeedsUpdate.length; i++) {
        await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(dataNeedsUpdate[i]));
      }
      let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllAccountMeterData(meter.accountId);
      this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == meter.facilityId });
      this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
      this.toastNotificationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "alert-success");
    }
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteMeter = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteMeter = false;
  }

  async deleteMeter() {
    this.showDeleteMeter = false;
    this.meterForm.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await firstValueFrom(this.utilityMeterDbService.deleteIndexWithObservable(this.utilityMeter.id));
    //delete meter data
    let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.utilityMeterDataDbService.getAll());
    let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(meterData => { return meterData.meterId == this.utilityMeter.guid });
    for (let index = 0; index < meterData.length; index++) {
      await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(meterData[index].id));
    }

    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    //set meters
    await this.dbChangesService.setMeters(account, selectedFacility);
    //set meter data
    await this.dbChangesService.setMeterData(account, true, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
    this.goToMeterList();
  }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }

  canDeactivate(): Observable<boolean> {
    if (this.meterForm && this.meterForm.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }
}
