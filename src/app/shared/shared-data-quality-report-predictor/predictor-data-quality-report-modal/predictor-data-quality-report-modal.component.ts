import { Component, Input } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-predictor-data-quality-report-modal',
  standalone: false,
  templateUrl: './predictor-data-quality-report-modal.component.html',
  styleUrl: './predictor-data-quality-report-modal.component.css'
})
export class PredictorDataQualityReportModalComponent {
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;

  showModal: boolean = false;

  openModal() {
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }

}
