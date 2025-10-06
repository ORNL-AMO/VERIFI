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
  comparisonSummaryWithDifferences: { readDate: Date, oldReading: number, newReading: number, difference: number, percentageDifference: number }[] = [];
  showModal: boolean = false;
  selectedMeterName: string;
  meterUnit: string;
  orderDataField: string = 'readDate';
  orderByDirection: 'asc' | 'desc' = 'desc';

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
  }

  openModal(summary: MeterDataSummary) {
    this.showModal = true;
    this.compareMeterData(summary);
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

  compareMeterData(summary: MeterDataSummary) {
    this.selectedMeterName = summary.meter.name;
    const inspectedFacility = summary.meter.facilityId;
    const inspectedMeterId = summary.meterId;

    const facility = this.facilities.find(facility => facility.guid === inspectedFacility);
    const meter = this.meters.find(meter => meter.guid === inspectedMeterId);
    const existingMeterReadings = this.utilityMeterDataDbService.accountMeterData.getValue().filter(data => (data.meterId === meter?.guid && data.facilityId === facility?.guid));

    this.comparisonSummaryWithDifferences = this.checkDifferences(existingMeterReadings, summary);
  }

  checkDifferences(meterData: Array<IdbUtilityMeterData>, newMeterDataSummary: MeterDataSummary): Array<{ readDate: Date, oldReading: number, newReading: number, difference: number, percentageDifference: number }> {
    const comparisonData = new Array<{ readDate: Date, oldReading: number, newReading: number, difference: number, percentageDifference: number }>();

    this.meterUnit = this.getReading(newMeterDataSummary.meterReadings[0], newMeterDataSummary.meter).unit;

    meterData.forEach(oldData => {
      const oldDateStr = oldData.readDate.getFullYear() + '-' + (oldData.readDate.getMonth() + 1) + '-' + oldData.readDate.getDate();
      for (let i = 0; i < newMeterDataSummary.meterReadings.length; i++) {
        const reading = newMeterDataSummary.meterReadings[i];
        const newDateStr = reading.readDate.getFullYear() + '-' + (reading.readDate.getMonth() + 1) + '-' + reading.readDate.getDate();
        if (oldDateStr === newDateStr) {
          let oldReading = this.getReading(oldData, newMeterDataSummary.meter).value;
          let newReading = this.getReading(reading, newMeterDataSummary.meter).value;
          let difference = Math.abs(newReading - oldReading);
          if (difference !== 0) {
            comparisonData.push({
              readDate: oldData.readDate,
              oldReading: oldReading,
              newReading: newReading,
              difference: difference,
              percentageDifference: (oldReading !== 0) ? (difference / oldReading * 100) : null
            });
          }
          break;
        }
      }
    });

    return comparisonData;
  }

  getReading(data: IdbUtilityMeterData, meter: IdbUtilityMeter) {
    if (meter.source === 'Electricity') {
      return { value: data.totalEnergyUse, unit: meter.startingUnit };
    }
    else if (meter.scope == 2) {
      return { value: data.totalEnergyUse, unit: meter.energyUnit };
    }
    else if (meter.scope == 5 || meter.scope == 6) {
      return { value: data.totalVolume, unit: meter.startingUnit };
    }
    else if (meter.scope != 2 && meter.scope != 5 && meter.scope != 6) {
      if (meter.source === 'Other' || meter.source === 'Water Intake' || meter.source === 'Water Discharge')
        return { value: data.totalVolume, unit: meter.startingUnit };
      else
        return { value: data.totalEnergyUse, unit: meter.energyUnit };
    }
  }

  selectMeterSummary(meterSummary: MeterDataSummary) {
    this.emitInspectSummary.emit(meterSummary);
  }
}
