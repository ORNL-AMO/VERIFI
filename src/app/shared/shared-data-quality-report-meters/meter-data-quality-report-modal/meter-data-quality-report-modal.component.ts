import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

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
