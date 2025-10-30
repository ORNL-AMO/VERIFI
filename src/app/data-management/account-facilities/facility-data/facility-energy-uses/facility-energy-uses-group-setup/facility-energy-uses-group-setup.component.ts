import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EnergyEquipmentEnergyUseData, EquipmentType, getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { EquipmentTypes } from '../facility-energy-use-equipment-form/equipmentTypes';
import { FormGroup } from '@angular/forms';
import { FacilityEnergyUseEquipmentFormService } from '../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';

@Component({
  selector: 'app-facility-energy-uses-group-setup',
  standalone: false,
  templateUrl: './facility-energy-uses-group-setup.component.html',
  styleUrl: './facility-energy-uses-group-setup.component.css'
})
export class FacilityEnergyUsesGroupSetupComponent {

  facility: IdbFacility;
  facilitySub: Subscription;

  setupStep: number = 1;

  numberOfGroups: number = 1;
  energyUseGroups: Array<IdbFacilityEnergyUseGroup & { numberOfEquipment: number, equipmentForms: Array<FormGroup> }>;
  groupSetupIndex: number = 0;
  equipmentTypes: Array<EquipmentType> = EquipmentTypes;
  numberOfEquipmentWarning: string;
  yearOptions: Array<{ year: number, selected: boolean }>
  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
    private loadingService: LoadingService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationsService: ToastNotificationsService,
    private accountDbService: AccountdbService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setYearOptions();
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  submitNumberOfGroups() {
    this.groupSetupIndex = 0;
    this.energyUseGroups = new Array();
    for (let i = 0; i < this.numberOfGroups; i++) {
      let newGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
      newGroup.name = 'Group ' + (this.energyUseGroups.length + 1);
      let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup)
      let equipmentForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(equipment, true);
      this.energyUseGroups.push({
        ...newGroup,
        numberOfEquipment: 1,
        equipmentForms: [equipmentForm]
      });
    }
    this.setupStep = 2;
  }

  nextGroup() {
    this.groupSetupIndex++;
  }

  previousGroup() {
    this.groupSetupIndex--;
  }

  async finalizeSetup() {
    this.loadingService.setLoadingMessage('Adding Energy Use Groups and Equipment...');
    this.loadingService.setLoadingStatus(true);
    for (let group of this.energyUseGroups) {
      let newGroup: IdbFacilityEnergyUseGroup = {
        accountId: group.accountId,
        facilityId: group.facilityId,
        guid: group.guid,
        name: group.name,
        notes: group.notes,
        sidebarOpen: false,
        modifiedDate: group.modifiedDate,
        createdDate: group.createdDate
      };
      newGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newGroup));
      for (let eqForm of group.equipmentForms) {
        let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup);
        newEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForm(newEquipment, eqForm);
        newEquipment.energyUseGroupId = newGroup.guid;
        let energyUseData: Array<EnergyEquipmentEnergyUseData> = new Array();
        for (let yearOption of this.yearOptions) {
          if (yearOption.selected) {
            energyUseData.push({
              year: yearOption.year,
              energyUse: undefined,
              hoursOfOperation: 8760,
              loadFactor: 100,
              dutyFactor: 100,
              efficiency: 100,
              overrideEnergyUse: false
            });
          }
        }
        newEquipment.energyUseData = energyUseData;
        await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(newEquipment));
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, this.facility);
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, this.facility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Groups and Equipment Added", undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }

  startOver() {
    this.setupStep = 1;
  }

  changeNumberOfEquipment(group: IdbFacilityEnergyUseGroup & { numberOfEquipment: number, equipmentForms: Array<FormGroup> }) {
    let currentNumberOfEquipment = group.equipmentForms.length;
    if (group.numberOfEquipment > 0 && group.numberOfEquipment <= 42) {
      this.numberOfEquipmentWarning = null;
      if (group.numberOfEquipment > currentNumberOfEquipment) {
        //add equipment
        let numberToAdd = group.numberOfEquipment - currentNumberOfEquipment;
        for (let i = 0; i < numberToAdd; i++) {
          let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(group);
          let equipmentForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(newEquipment, true);
          group.equipmentForms.push(equipmentForm);
        }
      } else if (group.numberOfEquipment < currentNumberOfEquipment) {
        //remove equipment
        let numberToRemove = currentNumberOfEquipment - group.numberOfEquipment;
        group.equipmentForms.splice(-numberToRemove, numberToRemove);
      }
    } else {
      if (group.numberOfEquipment > 42) {
        this.numberOfEquipmentWarning = 'Maximum number of systems/equipment that can be setup on this screen is 42.';
      } else {
        this.numberOfEquipmentWarning = 'Number of systems/equipment must be at least 1.';
      }
    }
  }

  addGroup() {
    let newGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
    newGroup.name = 'Group ' + (this.energyUseGroups.length + 1);
    let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup);
    let equipmentForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(equipment, true);
    this.energyUseGroups.push({
      ...newGroup,
      numberOfEquipment: 1,
      equipmentForms: [equipmentForm]
    });
    this.nextGroup();
  }

  removeEquipment(index: number) {
    this.energyUseGroups[this.groupSetupIndex].equipmentForms.splice(index, 1);
  }

  addEquipmentForm() {
    let currentGroup = this.energyUseGroups[this.groupSetupIndex];
    let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(currentGroup);
    let equipmentForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getFormFromEnergyUseEquipment(newEquipment, true);
    currentGroup.equipmentForms.push(equipmentForm);
    currentGroup.numberOfEquipment = currentGroup.equipmentForms.length;
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
}
