import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EquipmentType, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { FacilityEnergyUseEquipmentFormService } from './facility-energy-use-equipment-form.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { EquipmentTypes } from './equipmentTypes';
  
@Component({
  selector: 'app-facility-energy-use-equipment',
  standalone: false,
  templateUrl: './facility-energy-use-equipment.component.html',
  styleUrl: './facility-energy-use-equipment.component.css'
})
export class FacilityEnergyUseEquipmentComponent {

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  energyUseEquipment: IdbFacilityEnergyUseEquipment;
  form: FormGroup;

  showDeleteEquipment: boolean = false;
  // sourceOptions: Array<MeterSource> = AllSources;
  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private sharedDataService: SharedDataService,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private toastNotificationsService: ToastNotificationsService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let equipmentId: string = params['equipmentId'];
      this.energyUseEquipment = this.facilityEnergyUseEquipmentDbService.getByGuid(equipmentId);
      if (this.energyUseEquipment) {
        this.form = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(this.energyUseEquipment);
        //temporary
        if(!this.energyUseEquipment.energyUseData){
          this.energyUseEquipment.energyUseData = [];
        }
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.form.markAsPristine();
    this.energyUseEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForm(this.energyUseEquipment, this.form);
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(this.energyUseEquipment));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteEquipment = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteEquipment = false;
  }

  async deleteEquipment() {
    this.showDeleteEquipment = false;
    this.form.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Energy Use Equipment...')
    this.loadingService.setLoadingStatus(true);
    //delete equipment
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.deleteWithObservable(this.energyUseEquipment.id));
    //set equipment
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Equipment Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseEquipment.energyUseGroupId);
  }

  canDeactivate(): Observable<boolean> {
    if (this.form && this.form.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  addEnergyUseData(){
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let dates: Array<Date> = facilityMeterData.map(meterData => { return new Date(meterData.readDate) });
    let years: Array<number> = dates.map(date => { return date.getFullYear() });
    years = _.uniq(years);
    let startYear: number = _.min(years);
    let endYear: number = _.max(years);
    for(let year = startYear; year <= endYear; year++){
      if(!this.energyUseEquipment.energyUseData.find(data => { return data.year == year })){
        this.energyUseEquipment.energyUseData.push({
          year: year,
          energyUse: 0,
          hoursOfOperation: 0,
          loadFactor: 0,
          dutyFactor: 0,
          overrideValue: 0
        });
      }
    }
  }
}
