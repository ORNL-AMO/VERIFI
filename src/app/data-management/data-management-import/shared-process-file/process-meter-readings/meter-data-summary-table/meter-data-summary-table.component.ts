import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterDataSummary } from '../process-meter-readings.component';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-meter-data-summary-table',
  templateUrl: './meter-data-summary-table.component.html',
  styleUrl: './meter-data-summary-table.component.css',
  standalone: false
})
export class MeterDataSummaryTableComponent {
  @Input({ required: true })
  meterDataSummaries: Array<MeterDataSummary>;
  @Output('emitInspectSummary')
  emitInspectSummary: EventEmitter<MeterDataSummary> = new EventEmitter<MeterDataSummary>();

  skipAll: boolean = false;
  facilities: Array<IdbFacility>;
  meters: Array<IdbUtilityMeter>;
  comparisonSummaryWithDifferences: Array<MeterReadingComparison> = [];
  showModal: boolean = false;
  selectedMeterName: string;
  meterUnit: string;
  orderDataField: string = 'readDate';
  orderByDirection: 'asc' | 'desc' = 'desc';

  readingDifferencesMap: { [meterId: string]: MeterReadingComparison[] } = {};

  constructor(
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService
  ) { }
  setSkipAll() {
    this.skipAll = !this.skipAll;
  }

  ngOnInit() {
    this.facilities = this.facilityDbService.accountFacilities.getValue();
    this.meters = this.utilityMeterDbService.accountMeters.getValue();
    this.computeReadingChanges();
  }

  openModal(summary: MeterDataSummary) {
    this.showModal = true;
    this.selectedMeterName = summary.meter.name;
    this.comparisonSummaryWithDifferences = this.readingDifferencesMap[summary.meterId];
  }

  hideModal() {
    this.showModal = false;
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  computeReadingChanges() {
    this.readingDifferencesMap = {};
    this.meterDataSummaries.forEach(summary => {
      this.readingDifferencesMap[summary.meterId] = this.compareMeterData(summary);
    });
  }

  compareMeterData(summary: MeterDataSummary) {
    const inspectedFacility = summary.meter.facilityId;
    const inspectedMeterId = summary.meterId;

    const facility = this.facilities.find(facility => facility.guid === inspectedFacility);
    const meter = this.meters.find(meter => meter.guid === inspectedMeterId);
    const existingMeterReadings = this.utilityMeterDataDbService.accountMeterData.getValue().filter(data => (data.meterId === meter?.guid && data.facilityId === facility?.guid));

    return this.checkDifferences(existingMeterReadings, summary);
  }

  checkDifferences(meterData: Array<IdbUtilityMeterData>, newMeterDataSummary: MeterDataSummary): Array<MeterReadingComparison> {
    const comparisonData: Array<MeterReadingComparison> = [];

    meterData.forEach(oldData => {
      const oldDateStr = oldData.readDate.getFullYear() + '-' + (oldData.readDate.getMonth() + 1) + '-' + oldData.readDate.getDate();
      for (let i = 0; i < newMeterDataSummary.meterReadings.length; i++) {
        const reading = newMeterDataSummary.meterReadings[i];
        const newDateStr = reading.readDate.getFullYear() + '-' + (reading.readDate.getMonth() + 1) + '-' + reading.readDate.getDate();
        let meterReadingComparisonObj: MeterReadingComparison;
        if (oldDateStr === newDateStr) {
          meterReadingComparisonObj = this.getMeterReadingValues(oldData, reading, newMeterDataSummary.meter);
          if (meterReadingComparisonObj.difference != 0 || meterReadingComparisonObj.parametersWithDifference.length > 0) {
            comparisonData.push(meterReadingComparisonObj);
            this.meterUnit = meterReadingComparisonObj.unit;
          }
          break;
        }
      }
    });

    return comparisonData;
  }

  getMeterReadingValues(oldData: IdbUtilityMeterData, newData: IdbUtilityMeterData, meter: IdbUtilityMeter) {
    let meterReadingComparisonObj: MeterReadingComparison;

    if (meter.source === 'Electricity') {
      let difference: number = Math.abs(newData.totalEnergyUse - oldData.totalEnergyUse);
      let percentageDifference: number = (oldData.totalEnergyUse !== 0) ? (difference / oldData.totalEnergyUse * 100) : null;
      let diffMeterReadings: Array<string> = [];
      if (oldData.totalRealDemand !== newData.totalRealDemand && !(oldData.totalRealDemand == null && newData.totalRealDemand == null))
        diffMeterReadings.push('Total Real Demand');

      if (oldData.powerFactor !== newData.powerFactor && !(oldData.powerFactor == null && newData.powerFactor == null))
        diffMeterReadings.push('Power Factor');

      if (oldData.totalCost !== newData.totalCost && !(oldData.totalCost == null && newData.totalCost == null))
        diffMeterReadings.push('Total Cost');

      meterReadingComparisonObj = {
        readDate: oldData.readDate,
        oldReading: oldData.totalEnergyUse,
        newReading: newData.totalEnergyUse,
        difference: difference,
        percentageDifference: percentageDifference,
        unit: meter.startingUnit,
        parametersWithDifference: diffMeterReadings
      }
      return meterReadingComparisonObj;
    }
    else if (meter.scope == 2) {
      let difference: number = Math.abs(newData.totalVolume - oldData.totalVolume);
      let percentageDifference: number = (oldData.totalVolume !== 0) ? (difference / oldData.totalVolume * 100) : null;
      let diffMeterReadings: Array<string> = [];

      if (oldData.totalCost !== newData.totalCost && !(oldData.totalCost == null && newData.totalCost == null))
        diffMeterReadings.push('Total Cost');
      if (oldData.vehicleFuelEfficiency !== newData.vehicleFuelEfficiency && !(oldData.vehicleFuelEfficiency == null && newData.vehicleFuelEfficiency == null))
        diffMeterReadings.push('Vehicle Fuel Efficiency');

      meterReadingComparisonObj = {
        readDate: oldData.readDate,
        oldReading: oldData.totalVolume,
        newReading: newData.totalVolume,
        difference: difference,
        percentageDifference: percentageDifference,
        unit: meter.vehicleDistanceUnit,
        parametersWithDifference: diffMeterReadings
      }
      return meterReadingComparisonObj;
    }
    else if (meter.scope == 5 || meter.scope == 6) {
      let difference: number = Math.abs(newData.totalVolume - oldData.totalVolume);
      let percentageDifference: number = (oldData.totalVolume !== 0) ? (difference / oldData.totalVolume * 100) : null;
      let diffMeterReadings: Array<string> = [];

      if (oldData.totalCost !== newData.totalCost && !(oldData.totalCost == null && newData.totalCost == null))
        diffMeterReadings.push('Total Cost');

      meterReadingComparisonObj = {
        readDate: oldData.readDate,
        oldReading: oldData.totalVolume,
        newReading: newData.totalVolume,
        difference: difference,
        percentageDifference: percentageDifference,
        unit: meter.startingUnit,
        parametersWithDifference: diffMeterReadings
      }
      return meterReadingComparisonObj;
    }
    else if (meter.scope != 2 && meter.scope != 5 && meter.scope != 6) {
      if (meter.source === 'Other' || meter.source === 'Water Intake' || meter.source === 'Water Discharge') {
        let difference: number = Math.abs(newData.totalVolume - oldData.totalVolume);
        let percentageDifference: number = (oldData.totalVolume !== 0) ? (difference / oldData.totalVolume * 100) : null;
        let diffMeterReadings: Array<string> = [];

        if (oldData.totalCost !== newData.totalCost && !(oldData.totalCost == null && newData.totalCost == null))
          diffMeterReadings.push('Total Cost');

        meterReadingComparisonObj = {
          readDate: oldData.readDate,
          oldReading: oldData.totalVolume,
          newReading: newData.totalVolume,
          difference: difference,
          percentageDifference: percentageDifference,
          unit: meter.startingUnit,
          parametersWithDifference: diffMeterReadings
        }
        return meterReadingComparisonObj;
      }
      else {
        let difference: number = Math.abs(newData.totalEnergyUse - oldData.totalEnergyUse);
        let percentageDifference: number = (oldData.totalEnergyUse !== 0) ? (difference / oldData.totalEnergyUse * 100) : null;
        let diffMeterReadings: Array<string> = [];

        if (oldData.totalCost !== newData.totalCost && !(oldData.totalCost == null && newData.totalCost == null))
          diffMeterReadings.push('Total Cost');

        meterReadingComparisonObj = {
          readDate: oldData.readDate,
          oldReading: oldData.totalEnergyUse,
          newReading: newData.totalEnergyUse,
          difference: difference,
          percentageDifference: percentageDifference,
          unit: meter.startingUnit,
          parametersWithDifference: diffMeterReadings
        }
        return meterReadingComparisonObj;
      }
    }
  }

  selectMeterSummary(meterSummary: MeterDataSummary) {
    this.emitInspectSummary.emit(meterSummary);
  }
}

export interface MeterReadingComparison {
  readDate?: Date;
  oldReading?: number;
  newReading?: number;
  difference: number;
  percentageDifference: number;
  unit: string;
  parametersWithDifference: Array<string>;
}
