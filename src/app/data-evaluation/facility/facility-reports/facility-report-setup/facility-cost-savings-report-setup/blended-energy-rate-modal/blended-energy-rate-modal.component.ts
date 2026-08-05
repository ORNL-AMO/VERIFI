import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input()
  showModal: boolean;
  @Input()
  group: AnalysisGroup;
  @Input()
  year: number;
  @Input()
  selectedAnalysisItem: IdbAnalysisItem;
  @Input()
  report: IdbFacilityReport;

  groupMeters: Array<IdbUtilityMeter>;
  unitCostPerMeter: { [meterId: string]: number } = {};
  groupMonthlyData: Array<MonthlyData>;
  selectedFacility: IdbFacility;
  calanderizedMeterData: Array<CalanderizedMeter>;
  totalGroupConsumption: number;
  consumptionPercentagePerMeter: { [meterId: string]: number } = {};
  convertedConsumptionRatePerMeter: { [meterId: string]: number } = {};
  finalUnit: string;
  blendedRate: number;
  convertedBlendedRate: number;
  groupCalculatedUnit: string;
  sameUnitForAllMeters: boolean;
  finalBlendedRate: number;

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
    this.isMeterUnitSame();
    if (this.report && this.report.costSavingsReportSettings && this.report.costSavingsReportSettings.groupUnits) {
      this.groupCalculatedUnit = this.report.costSavingsReportSettings.groupUnits[this.group.idbGroupId];
    }
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
    this.selectedFacility = this.accountWorkspaceStore.selectedFacility();
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.calanderizedMeterData = getCalanderizedMeterData(this.groupMeters, facilityMeterData, this.selectedFacility, false, { energyIsSource: this.selectedAnalysisItem.energyIsSource, neededUnits: getNeededUnits(this.selectedAnalysisItem) }, [], [], [this.selectedFacility], account.assessmentReportVersion, []);
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

      if (this.totalGroupConsumption > 0) {
        this.consumptionPercentagePerMeter[meter.guid] = meterConsumptionForYear / this.totalGroupConsumption;
      } else {
        this.consumptionPercentagePerMeter[meter.guid] = 0;
      }
    });
  }

  checkConsumption(meter: IdbUtilityMeter): boolean {
    const consumption = this.consumptionPercentagePerMeter[meter.guid];
    return consumption != undefined && consumption != null && !isNaN(consumption);
  }

  convertConsumptionRates(meter: IdbUtilityMeter) {
    const unitCost = this.getUnitCost(meter);
    this.convertedConsumptionRatePerMeter[meter.guid] = convertConsumptionRate(meter, unitCost, this.finalUnit, this.selectedAnalysisItem.analysisCategory);
    if(this.sameUnitForAllMeters) {
      this.calculateTotalUnitCost();
    }
    this.calculateConvertedTotalUnitCost();
  }

  getUnitCost(meter: IdbUtilityMeter): number {
    const unitCost = this.unitCostPerMeter[meter.guid];
    return (unitCost && !isNaN(unitCost)) ? unitCost : 0;
  }

  saveBlendedRate() {
    this.calculatedBlendedRate.emit(this.finalBlendedRate);
  }

  getRoundedValue(meter: IdbUtilityMeter): number {
    const convertedRate = this.convertedConsumptionRatePerMeter[meter.guid] || 0;
    return Math.round(convertedRate * 100) / 100;
  }

  calculateTotalUnitCost() {
    this.blendedRate = 0;
    this.groupMeters.forEach(meter => {
      const consumptionPercentage = this.consumptionPercentagePerMeter[meter.guid] || 0;
      const unitCost = this.unitCostPerMeter[meter.guid] || 0;
      this.blendedRate += consumptionPercentage * unitCost;
    });
    this.blendedRate = Math.round(this.blendedRate * 100) / 100;
    this.finalBlendedRate = this.blendedRate;
  }

  calculateConvertedTotalUnitCost() {
    this.convertedBlendedRate = 0;
    this.groupMeters.forEach(meter => {
      const consumptionPercentage = this.consumptionPercentagePerMeter[meter.guid] || 0;
      const convertedRate = this.convertedConsumptionRatePerMeter[meter.guid] || 0;
      this.convertedBlendedRate += consumptionPercentage * convertedRate;
    });
    this.convertedBlendedRate = Math.round(this.convertedBlendedRate * 100) / 100;
    if(!this.sameUnitForAllMeters) {
      this.blendedRate = this.convertedBlendedRate;
      this.finalBlendedRate = this.convertedBlendedRate;
    }
  }

  isMeterUnitSame() {
    let mobileMeters = this.groupMeters.filter(meter => (meter.source == 'Other Fuels' && meter.scope == 2));
    if (mobileMeters.length == 0) {
      this.sameUnitForAllMeters = this.groupMeters.every(meter => meter.startingUnit == this.groupMeters[0].startingUnit);
    }
    else if (mobileMeters.length == this.groupMeters.length) {
      this.sameUnitForAllMeters = mobileMeters.every(meter => meter.vehicleCollectionUnit == mobileMeters[0].vehicleCollectionUnit);
    }
    else if (mobileMeters.length > 0 && mobileMeters.length < this.groupMeters.length) {
      let nonMobileMeters = this.groupMeters.filter(meter => !(meter.source == 'Other Fuels' && meter.scope == 2));
      let isNonMobileSameUnit = nonMobileMeters.every(meter => meter.startingUnit == nonMobileMeters[0].startingUnit);
      let isMobileSameUnit = mobileMeters.every(meter => meter.vehicleCollectionUnit == mobileMeters[0].vehicleCollectionUnit);
      if (isNonMobileSameUnit && isMobileSameUnit && nonMobileMeters[0].startingUnit == mobileMeters[0].vehicleCollectionUnit) {
        this.sameUnitForAllMeters = true;
      }
    }
  }
}
