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
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EnergyEquipmentEnergyUseData, EquipmentType, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { EquipmentTypes } from '../facility-energy-use-equipment-form/equipmentTypes';
import { FacilityEnergyUseEquipmentFormService } from '../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';

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
  yearOptions: Array<{ year: number, selected: boolean }>
  dataChanged: boolean = false;
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
      this.setYearOptions();
      this.energyUseEquipment = this.facilityEnergyUseEquipmentDbService.getByGuid(equipmentId);
      if (this.energyUseEquipment) {
        this.form = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(this.energyUseEquipment, false);
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
    this.dataChanged = false;
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
    if ((this.form && this.form.dirty) || this.dataChanged) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  addEnergyUseData() {
    for (let yearOption of this.yearOptions) {
      if (yearOption.selected) {
        this.energyUseEquipment.energyUseData.push({
          year: yearOption.year,
          energyUse: 0,
          hoursOfOperation: 8760,
          loadFactor: 100,
          dutyFactor: 100,
          efficiency: 100,
          overrideEnergyUse: false
        });
      }
    }
    this.dataChanged = true;
  }

  addEnergyUseYear() {
    let currentYears: Array<number> = this.energyUseEquipment.energyUseData.map(data => { return data.year });
    let availableYears: Array<{ year: number }> = this.yearOptions.filter(yearOption => { return !currentYears.includes(yearOption.year) });
    let year: number = availableYears[0].year;
    this.energyUseEquipment.energyUseData.push({
      year: year,
      energyUse: 0,
      hoursOfOperation: 8760,
      loadFactor: 100,
      dutyFactor: 100,
      efficiency: 100,
      overrideEnergyUse: false
    });
    this.dataChanged = true;
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let dates: Array<Date> = facilityMeterData.map(meterData => { return new Date(meterData.readDate) });
    let years: Array<number> = dates.map(date => { return date.getFullYear() });
    years = _.uniq(years);
    let startYear: number = _.min(years);
    let endYear: number = _.max(years);
    for (let year = startYear; year <= endYear; year++) {
      this.yearOptions.push({ year: year, selected: true });
    }
  }

  setDataChanged() {
    this.dataChanged = true;
  }

  removeEnergyUseData(data: EnergyEquipmentEnergyUseData) {
    this.energyUseEquipment.energyUseData = this.energyUseEquipment.energyUseData.filter(d => d.year !== data.year);
    this.dataChanged = true;
  }

  toggleOverride(data: EnergyEquipmentEnergyUseData) {
    data.overrideEnergyUse = !data.overrideEnergyUse;
    this.dataChanged = true;
    //todo calculate if turning off override
  }

  clearData() {
    this.energyUseEquipment.energyUseData = [];
    this.dataChanged = true;
  }
}
