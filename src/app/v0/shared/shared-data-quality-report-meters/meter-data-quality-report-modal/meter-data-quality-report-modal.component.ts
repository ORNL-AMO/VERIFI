import { Component, Input } from '@angular/core';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-data-quality-report-modal',
  standalone: false,
  templateUrl: './meter-data-quality-report-modal.component.html',
  styleUrl: './meter-data-quality-report-modal.component.css'
})
export class MeterDataQualityReportModalComponent {
  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;

  showModal: boolean = false;

  openModal() {
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }
}
