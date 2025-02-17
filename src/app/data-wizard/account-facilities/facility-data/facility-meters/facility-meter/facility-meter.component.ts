import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of, Subscription } from 'rxjs';
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
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-meter',
  templateUrl: './facility-meter.component.html',
  styleUrl: './facility-meter.component.css',
  standalone: false
})
export class FacilityMeterComponent {

  facility: IdbFacility;
  facilitySub: Subscription;


  utilityMeter: IdbUtilityMeter;
  meterForm: FormGroup;
  showDeleteMeter: boolean = false;
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
    private utilityMeterDataDbService: UtilityMeterDatadbService
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
    this.meterForm.markAsPristine();
    this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.utilityMeter.guid);
    this.utilityMeter = this.editMeterFormService.updateMeterFromForm(this.utilityMeter, this.meterForm);
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.utilityMeter));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
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
    await this.dbChangesService.setMeterData(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
    this.goToMeterList();
  }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-wizard/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }

  canDeactivate(): Observable<boolean> {
    if (this.meterForm && this.meterForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

}
