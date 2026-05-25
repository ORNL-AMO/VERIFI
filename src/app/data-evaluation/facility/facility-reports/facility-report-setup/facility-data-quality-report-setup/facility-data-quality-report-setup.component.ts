import { Component } from '@angular/core';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-facility-data-quality-report-setup',
  standalone: false,
  templateUrl: './facility-data-quality-report-setup.component.html',
  styleUrl: './facility-data-quality-report-setup.component.css',
})
export class FacilityDataQualityReportSetupComponent {

  facilityMeters: Array<IdbUtilityMeter>;
  facilityPredictors: Array<IdbPredictor>;
  selectedMeters: Array<IdbUtilityMeter> = [];
  selectedPredictors: Array<IdbPredictor> = [];

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService
  ) { }

  ngOnInit(): void {
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    this.facilityPredictors = this.predictorDbService.facilityPredictors.getValue();
  }

  toggleMeter(meter: IdbUtilityMeter) {
  const idx = this.selectedMeters.indexOf(meter);
  if (idx > -1) {
    this.selectedMeters.splice(idx, 1);
  } else {
    this.selectedMeters.push(meter);
  }
}

togglePredictor(predictor: IdbPredictor) {
  const idx = this.selectedPredictors.indexOf(predictor);
  if (idx > -1) {
    this.selectedPredictors.splice(idx, 1);
  } else {
    this.selectedPredictors.push(predictor);
  }
}
}
