import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters } from 'src/app/models/meterDataFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import { CalanderizationService, EmissionsResults } from 'src/app/shared/helper-services/calanderization.service';

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
    private calanderizationService: CalanderizationService) { }

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
    if (this.addOrEdit == 'add') {
      //new meter entry should have any year/month combo of existing meter reading
      this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() == changeDate.getUTCMonth() && currentMeterItemDate.getUTCDate() == changeDate.getUTCDate()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
      }
    }
  }

  setTotalEmissions(){
    if(this.meterDataForm.controls.totalEnergyUse.value){
      let emissionsValues: EmissionsResults = this.calanderizationService.getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit, new Date(this.meterDataForm.controls.readDate.value).getFullYear(), false);
      this.totalLocationEmissions = emissionsValues.locationEmissions;
      this.totalMarketEmissions = emissionsValues.marketEmissions;
      this.RECs = emissionsValues.RECs;
    }else{
      this.totalLocationEmissions = 0;
      this.totalMarketEmissions = 0;
      this.RECs = 0;
    }
  }

}
