import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityEnergyUsesSetupService } from '../../facility-energy-uses-setup.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-add-year-setup-options',
  standalone: false,
  templateUrl: './add-year-setup-options.component.html',
  styleUrl: './add-year-setup-options.component.css',
})
export class AddYearSetupOptionsComponent {
  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<{
    guid: string,
    name: string,
    selected: boolean
  }>;
  facilityEnergyUseGroupsSub: Subscription;
  setupYear: number;
  yearOptions: Array<number>;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private router: Router,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private route: ActivatedRoute,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setYearOptions();
    });

    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups.map(group => {
        return {
          guid: group.guid,
          name: group.name,
          selected: true
        }
      });
    });
  }

  ngOnDestroy() {
    this.facilityEnergyUseGroupsSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  toggleGroupSelection(group: { guid: string, name: string, selected: boolean }) {
    group.selected = !group.selected;
  }

  async goToEquipmentDetails() {
    this.facilityEnergyUsesSetupService.existingGroupsToEdit = this.facilityEnergyUseGroups.filter(group => group.selected).map(group => group.guid);
    //add year of data to selected groups and then navigate to edit existing groups screen
    for (let groupId of this.facilityEnergyUsesSetupService.existingGroupsToEdit) {
      let groupEquipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.getByEnergyUseGroupId(groupId);
      for (let equipment of groupEquipment) {
        let checkHasDataForYear: EnergyEquipmentOperatingConditionsData = equipment.operatingConditionsData.find(data => data.year == this.setupYear);
        if (!checkHasDataForYear) {
          let mostRecentYearOfData: number = Math.max(...equipment.operatingConditionsData.map(data => data.year));
          let mostRecentData: EnergyEquipmentOperatingConditionsData = equipment.operatingConditionsData.find(data => data.year == mostRecentYearOfData);
          let newData: EnergyEquipmentOperatingConditionsData = {
            ...mostRecentData,
            year: this.setupYear
          }
          equipment.operatingConditionsData.push(newData);
          equipment.utilityData.forEach(utility => {
            let mostRecentYearOfUtilityData: EquipmentUtilityDataEnergyUse = utility.energyUse.find(data => data.year == mostRecentYearOfData);
            utility.energyUse.push({ year: this.setupYear, energyUse: mostRecentYearOfUtilityData.energyUse, overrideEnergyUse: false })
          })
          await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(equipment));
        }
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, this.facility);
    this.router.navigate(['../../modify-annual-data', this.setupYear], { relativeTo: this.route });
  }

  leaveGroupSetup() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterDataYears: { endYear: number, startYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
    for (let year = facilityMeterDataYears.startYear; year <= facilityMeterDataYears.endYear; year++) {
      this.yearOptions.push(year);
    }
    if (!this.setupYear) {
      this.setupYear = this.yearOptions[this.yearOptions.length - 1];
    }
  }
}
