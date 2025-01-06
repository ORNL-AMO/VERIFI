import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters } from 'src/app/models/meterDataFilter';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { checkMeterReadingExistForDate, IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';

@Component({
  selector: 'app-edit-electricity-bill',
  templateUrl: './edit-electricity-bill.component.html',
  styleUrls: ['./edit-electricity-bill.component.css']
})
export class EditElectricityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: 'add' | 'edit';
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  invalidDate: boolean;

  electricityDataFilters: ElectricityDataFilters;
  electricityDataFiltersSub: Subscription;
  showDetailsColumnOne: boolean;
  showDetailsColumnTwo: boolean;
  detailedChargesFilter: DetailedChargesFilters;
  additionalChargesFilter: AdditionalChargesFilters;


  energyUnit: string;
  totalLocationEmissions: number = 0;
  totalMarketEmissions: number = 0;
  RECs: number = 0;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private eGridService: EGridService, private facilityDbService: FacilitydbService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
      this.detailedChargesFilter = dataFilters.detailedCharges;
      this.additionalChargesFilter = dataFilters.additionalCharges;
      this.setDisplayColumns();
    });
    this.setTotalEmissions();
  }

  ngOnChanges() {
    this.energyUnit = this.editMeter.startingUnit;
    this.checkDate();
    this.setTotalEmissions();
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
  }

  setDisplayColumns() {
    this.showDetailsColumnOne = (
      this.detailedChargesFilter.block1 || this.detailedChargesFilter.block2 || this.detailedChargesFilter.block3 || this.detailedChargesFilter.other
    );

    this.showDetailsColumnTwo = (
      this.detailedChargesFilter.onPeak || this.detailedChargesFilter.offPeak || this.detailedChargesFilter.powerFactor
    );
  }

  checkDate() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (this.addOrEdit == 'add') {
      //new meter entry should have any year/month combo of existing meter reading
      this.invalidDate = checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter, accountMeterData) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() == changeDate.getUTCMonth() && currentMeterItemDate.getUTCDate() == changeDate.getUTCDate()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter, accountMeterData) != undefined;
      }
    }
  }

  setTotalEmissions() {
    if (this.meterDataForm.controls.totalEnergyUse.value) {
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      let emissionsValues: EmissionsResults = getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit, new Date(this.meterDataForm.controls.readDate.value).getFullYear(), false, [facility], this.eGridService.co2Emissions, customFuels, 0, undefined, undefined, undefined);
      this.totalLocationEmissions = emissionsValues.locationElectricityEmissions;
      this.totalMarketEmissions = emissionsValues.marketElectricityEmissions;
      this.RECs = emissionsValues.RECs;
    } else {
      this.totalLocationEmissions = 0;
      this.totalMarketEmissions = 0;
      this.RECs = 0;
    }
  }

}
