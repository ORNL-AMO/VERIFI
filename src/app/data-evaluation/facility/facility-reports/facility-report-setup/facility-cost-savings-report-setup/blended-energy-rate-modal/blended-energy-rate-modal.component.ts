import { Component, EventEmitter, Input, Output } from '@angular/core';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

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

  groupMeters: Array<IdbUtilityMeter>;
  unitCostPerMeter: { [meterId: string]: number } = {};
  groupMonthlyData: Array<MonthlyData>;
  selectedFacility: IdbFacility;
  calanderizedMeterData: Array<CalanderizedMeter>;
  totalGroupEnergy: number;
  energyPercentagePerMeter: { [meterId: string]: number } = {};
  convertedEnergyRatePerMeter: { [meterId: string]: number } = {};

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
    this.calculateGroupEnergyForYear();
  }

  closeCalculator() {
    this.close.emit();
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
        existingData.energyCost += monthlyData.energyCost;
        existingData.energyConsumption += monthlyData.energyConsumption;
      } else {
        acc.push({ ...monthlyData });
      }
      return acc;
    }, new Array<MonthlyData>());

    this.groupMonthlyData = this.groupMonthlyData.filter(data => {
      return data.year == this.year;
    });

    this.totalGroupEnergy = this.groupMonthlyData.reduce((total, data) => total + data.energyUse, 0);
    this.calculateMeterContribution();
  }

  calculateMeterContribution() {
    this.groupMeters.forEach(meter => {
      let meterData = this.calanderizedMeterData.find(data => data.meter.guid == meter.guid);
      let meterMonthlyDataForYear = meterData.monthlyData.filter(data => data.year == this.year);
      let meterEnergyForYear = meterMonthlyDataForYear.reduce((total, data) => total + data.energyUse, 0);
      this.energyPercentagePerMeter[meter.guid] = meterEnergyForYear / this.totalGroupEnergy;
    });
  }

  convertEnergyRates(meter: IdbUtilityMeter) {
    const unitCost = this.unitCostPerMeter[meter.guid];
    if (unitCost && !isNaN(unitCost)) {
      const unitsPerMMBtu = new ConvertValue(1, 'MMBtu', meter.startingUnit).convertedValue;
      if (unitsPerMMBtu && unitsPerMMBtu > 0) {
        this.convertedEnergyRatePerMeter[meter.guid] = unitCost * unitsPerMMBtu;
      } else {
        this.convertedEnergyRatePerMeter[meter.guid] = 0;
      }
    } else {
      this.convertedEnergyRatePerMeter[meter.guid] = 0;
    }
  }

  calculateBlendedRate() {
    let blendedRate = 0;
    this.groupMeters.forEach(meter => {
      const energyPercentage = this.energyPercentagePerMeter[meter.guid] || 0;
      const convertedRate = this.convertedEnergyRatePerMeter[meter.guid] || 0;
      blendedRate += energyPercentage * convertedRate;
    });
    this.calculatedBlendedRate.emit(blendedRate);
  }
}
