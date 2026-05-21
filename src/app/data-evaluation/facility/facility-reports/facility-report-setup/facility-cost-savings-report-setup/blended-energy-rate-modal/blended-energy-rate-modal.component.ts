import { Component, EventEmitter, Input, Output } from '@angular/core';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { convertConsumptionRate, getMeterCollectionUnit } from 'src/app/shared/sharedHelperFunctions';

@Component({
  selector: 'app-blended-energy-rate-modal',
  standalone: false,
  templateUrl: './blended-energy-rate-modal.component.html',
  styleUrl: './blended-energy-rate-modal.component.css',
})
export class BlendedEnergyRateModalComponent {

  @Input()
  showModal: boolean;
  @Input()
  group: AnalysisGroup;
  @Input()
  year: number;
  @Input()
  selectedAnalysisItem: IdbAnalysisItem;

  groupMeters: Array<IdbUtilityMeter>;
  unitCostPerMeter: { [meterId: string]: number } = {};
  groupMonthlyData: Array<MonthlyData>;
  selectedFacility: IdbFacility;
  calanderizedMeterData: Array<CalanderizedMeter>;
  totalGroupConsumption: number;
  consumptionPercentagePerMeter: { [meterId: string]: number } = {};
  convertedConsumptionRatePerMeter: { [meterId: string]: number } = {};
  finalUnit: string;

  @Output()
  close = new EventEmitter<void>();
  @Output()
  calculatedBlendedRate = new EventEmitter<number>();

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.groupMeters = facilityMeters.filter(meter => {
      return this.group.idbGroupId == meter.groupId;
    });
    this.setFinalUnit();
    this.calculateGroupEnergyForYear();
  }

  closeCalculator() {
    this.close.emit();
  }

  setFinalUnit() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.analysisCategory == 'energy' && this.selectedAnalysisItem.energyUnit) {
        this.finalUnit = this.selectedAnalysisItem.energyUnit;
      }
      else if (this.selectedAnalysisItem.analysisCategory == 'water' && this.selectedAnalysisItem.waterUnit) {
        this.finalUnit = this.selectedAnalysisItem.waterUnit;
      }
    }
  }

  getCollectionUnit(meter: IdbUtilityMeter): string {
    return getMeterCollectionUnit(meter);
  }

  calculateGroupEnergyForYear() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.calanderizedMeterData = getCalanderizedMeterData(this.groupMeters, facilityMeterData, this.selectedFacility, false, { energyIsSource: this.selectedFacility.energyIsSource, neededUnits: undefined }, [], [], [this.selectedFacility], account.assessmentReportVersion, []);
    this.groupMonthlyData = this.calanderizedMeterData.flatMap(meter => { return meter.monthlyData });
    this.groupMonthlyData = this.groupMonthlyData.reduce((acc, monthlyData) => {
      let existingData = acc.find(data => { return data.month == monthlyData.month && data.year == monthlyData.year });
      if (existingData) {
        existingData.energyUse += monthlyData.energyUse;
        existingData.energyConsumption += monthlyData.energyConsumption;
      } else {
        acc.push({ ...monthlyData });
      }
      return acc;
    }, new Array<MonthlyData>());

    this.groupMonthlyData = this.groupMonthlyData.filter(data => {
      return data.year == this.year;
    });

    if (this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.totalGroupConsumption = this.groupMonthlyData.reduce((total, data) => total + data.energyUse, 0);
    } else if (this.selectedAnalysisItem.analysisCategory == 'water') {
      this.totalGroupConsumption = this.groupMonthlyData.reduce((total, data) => total + data.energyConsumption, 0);
    }
    this.calculateMeterContribution();
  }

  calculateMeterContribution() {
    this.groupMeters.forEach(meter => {
      let meterData = this.calanderizedMeterData.find(data => data.meter.guid == meter.guid);
      let meterMonthlyDataForYear = meterData.monthlyData.filter(data => data.year == this.year);

      let meterConsumptionForYear: number = 0;
      if (this.selectedAnalysisItem.analysisCategory == 'energy') {
        meterConsumptionForYear = meterMonthlyDataForYear.reduce((total, data) => total + data.energyUse, 0);
      } else if (this.selectedAnalysisItem.analysisCategory == 'water') {
        meterConsumptionForYear = meterMonthlyDataForYear.reduce((total, data) => total + data.energyConsumption, 0);
      }

      this.consumptionPercentagePerMeter[meter.guid] = meterConsumptionForYear / this.totalGroupConsumption;
    });
  }

  checkConsumption(meter: IdbUtilityMeter): boolean {
    const consumption = this.consumptionPercentagePerMeter[meter.guid];
    return consumption != undefined && consumption != null && !isNaN(consumption);
  }

  convertConsumptionRates(meter: IdbUtilityMeter) {
    const unitCost = this.getUnitCost(meter);
    this.convertedConsumptionRatePerMeter[meter.guid] = convertConsumptionRate(meter, unitCost, this.finalUnit, this.selectedAnalysisItem.analysisCategory);
  }

  getUnitCost(meter: IdbUtilityMeter): number {
    const unitCost = this.unitCostPerMeter[meter.guid];
    return (unitCost && !isNaN(unitCost)) ? unitCost : 0;
  }

  calculateBlendedRate() {
    let blendedRate = 0;
    this.groupMeters.forEach(meter => {
      const consumptionPercentage = this.consumptionPercentagePerMeter[meter.guid] || 0;
      const convertedRate = this.convertedConsumptionRatePerMeter[meter.guid] || 0;
      blendedRate += consumptionPercentage * convertedRate;
    });
    blendedRate = Math.round(blendedRate * 100) / 100;
    this.calculatedBlendedRate.emit(blendedRate);
  }
}
