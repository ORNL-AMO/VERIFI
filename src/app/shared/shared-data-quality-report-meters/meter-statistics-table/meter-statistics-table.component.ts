import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getUnitFromMeter, Statistics } from '../meterDataQualityStatistics';
import { CopyTableService } from '../../helper-services/copy-table.service';

@Component({
  selector: 'app-meter-statistics-table',
  standalone: false,

  templateUrl: './meter-statistics-table.component.html',
  styleUrl: './meter-statistics-table.component.css'
})
export class MeterStatisticsTableComponent {
  @Input()
  meterData: Array<IdbUtilityMeterData>;
  @Input()
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  energyStats: Statistics;
  @Input({ required: true })
  costStats: Statistics;

  unit: string;
  copyingTable: boolean = false;
  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  constructor(
    private copyTableService: CopyTableService
  ) { }

  ngOnChanges() {
    this.setUnit();
  }

  setUnit() {
    this.unit = getUnitFromMeter(this.selectedMeter, this.meterData);
  }

  isValueNaN(value: any): boolean {
    return isNaN(value);
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200);
  }
}