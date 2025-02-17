import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterDataSummary } from '../process-template-meter-readings.component';

@Component({
  selector: 'app-meter-data-summary-table',
  templateUrl: './meter-data-summary-table.component.html',
  styleUrl: './meter-data-summary-table.component.css',
  standalone: false
})
export class MeterDataSummaryTableComponent {
  @Input({required: true})
  meterDataSummaries: Array<MeterDataSummary>;
  @Output('emitInspectSummary')
  emitInspectSummary: EventEmitter<MeterDataSummary> = new EventEmitter<MeterDataSummary>();


  skipAll: boolean = false;
  setSkipAll(){
    this.skipAll = !this.skipAll;
  }


  selectMeterSummary(meterSummary: MeterDataSummary){
    this.emitInspectSummary.emit(meterSummary);
  }
}
