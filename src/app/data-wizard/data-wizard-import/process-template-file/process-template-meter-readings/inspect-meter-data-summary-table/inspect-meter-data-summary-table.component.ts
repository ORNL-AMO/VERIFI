import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterDataSummary } from '../process-template-meter-readings.component';

@Component({
  selector: 'app-inspect-meter-data-summary-table',
  templateUrl: './inspect-meter-data-summary-table.component.html',
  styleUrl: './inspect-meter-data-summary-table.component.css',
  standalone: false
})
export class InspectMeterDataSummaryTableComponent {
  @Input({required: true})
  meterDataSummary: MeterDataSummary;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();


  closeSummary(){
    this.emitClose.emit(true);
  }
}
