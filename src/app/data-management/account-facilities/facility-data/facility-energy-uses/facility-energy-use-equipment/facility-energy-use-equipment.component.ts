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
import { EnergyEquipmentOperatingConditionsData, EquipmentType, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { EquipmentTypes } from '../calculations/equipmentTypes';
import { FacilityEnergyUseEquipmentFormService } from '../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-facility-energy-use-equipment',
  standalone: false,
  templateUrl: './facility-energy-use-equipment.component.html',
  styleUrl: './facility-energy-use-equipment.component.css'
})
export class FacilityEnergyUseEquipmentComponent {

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  energyUseEquipment: IdbFacilityEnergyUseEquipment;

  equipmentDetailsForm: FormGroup;
  utilityDataForms: Array<{
    energySource: MeterSource,
    utilityDataForm: FormGroup,
    energyUseForms: Array<FormGroup>
  }>;
  annualOperatingConditionsDataForms: Array<FormGroup>;

  formsInvalid: boolean = false;

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
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService
  ) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let equipmentId: string = params['equipmentId'];
      this.setYearOptions();
      this.energyUseEquipment = this.facilityEnergyUseEquipmentDbService.getByGuid(equipmentId);
      if (this.energyUseEquipment) {
        this.equipmentDetailsForm = this.facilityEnergyUseEquipmentFormService.getEquipmentDetailsFromFromEnergyUseEquipment(this.energyUseEquipment);
        this.equipmentDetailsForm.controls['utilityMeterGroupId'].valueChanges.subscribe(() => {
          this.setUtilityTypes();
        });

        this.utilityDataForms = this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(this.energyUseEquipment);
        this.annualOperatingConditionsDataForms = this.facilityEnergyUseEquipmentFormService.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(this.energyUseEquipment);
        // this.form = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(this.energyUseEquipment, false);
        // this.form.valueChanges.subscribe(() => {
        //   this.calculateEnergyUse();
        //   this.dataChanged = true;
        // });
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    // this.form.markAsPristine();
    this.energyUseEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForms(this.energyUseEquipment, this.equipmentDetailsForm, this.utilityDataForms, this.annualOperatingConditionsDataForms);
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
    // this.form.markAsPristine();
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
    // TODO: logic
    // if ((this.form && this.form.dirty) || this.dataChanged) {
    //   const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
    //   return of(result);
    // }
    return of(true);
  }

  addOperatingConditionsData() {
    for (let yearOption of this.yearOptions) {
      if (yearOption.selected) {
        this.energyUseEquipment.operatingConditionsData.push({
          year: yearOption.year,
          hoursOfOperation: 8760,
          loadFactor: 100,
          dutyFactor: 100,
          efficiency: 100
        });
      }
    }
    this.dataChanged = true;
  }

  addOperatingConditionsYear() {
    let currentYears: Array<number> = this.energyUseEquipment.operatingConditionsData.map(data => { return data.year });
    let availableYears: Array<{ year: number }> = this.yearOptions.filter(yearOption => { return !currentYears.includes(yearOption.year) });
    let year: number = availableYears[0].year;
    this.energyUseEquipment.operatingConditionsData.push({
      year: year,
      hoursOfOperation: 8760,
      loadFactor: 100,
      dutyFactor: 100,
      efficiency: 100
    });
    //add year to utility data energy use
    // this.facilityEnergyUseEquipmentFormService.addYearToUtilityDataForm(this.form, year);
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

  removeOperatingConditionsData(data: EnergyEquipmentOperatingConditionsData) {
    this.energyUseEquipment.operatingConditionsData = this.energyUseEquipment.operatingConditionsData.filter(d => d.year !== data.year);
    // this.facilityEnergyUseEquipmentFormService.removeYearFromUtilityDataForm(this.form, data.year);
    this.dataChanged = true;
  }

  clearData() {
    this.energyUseEquipment.operatingConditionsData = [];
    // this.facilityEnergyUseEquipmentFormService.removeAllYearsFromUtilityDataForm(this.form);
    this.dataChanged = true;
  }

  calculateEnergyUse() {
    console.log('calculate energy use');
  }



  setUtilityTypes() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == this.equipmentDetailsForm.controls['utilityMeterGroupId'].value; });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    sources = _.uniq(sources);
    sources.forEach(source => {
      if (!this.utilityDataForms.find(udf => { return udf.energySource == source })) {
        let years: Array<number> = this.annualOperatingConditionsDataForms.map(form => { return form.controls['year'].value });
        let utilityData: EquipmentUtilityData = {
          energySource: source,
          size: 0,
          numberOfEquipment: 1,
          units: '',
          energyUse: years.map(year => {
            return {
              year: year,
              energyUse: 0,
              overrideEnergyUse: false
            };
          })
        };
        let newForm: {
          energySource: MeterSource,
          utilityDataForm: FormGroup,
          energyUseForms: Array<FormGroup>
        } = this.facilityEnergyUseEquipmentFormService.getUtilityDataForm(utilityData);
        this.utilityDataForms.push(newForm);
      }
    });
    //remove any that are not in the meter group
    console.log('before filter', this.utilityDataForms);
    console.log('sources', sources);
    this.utilityDataForms = this.utilityDataForms.filter(udf => { return sources.includes(udf.energySource) });
    console.log('after filter', this.utilityDataForms);
    // this.cd.detectChanges();
  }
}
