import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';

@Component({
  selector: 'app-edit-predictors',
  templateUrl: './edit-predictors.component.html',
  styleUrls: ['./edit-predictors.component.css', '../predictor-data.component.css']
})
export class EditPredictorsComponent implements OnInit {
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  facilityPredictors: Array<PredictorData>;
  predictorToDelete: PredictorData;

  predictorEntries: Array<IdbPredictorEntry>;
  constructor(private predictorDbService: PredictordbService, private analysisDbService: AnalysisDbService,
    private loadingService: LoadingService, private toastNoticationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.predictorEntries = this.predictorDbService.facilityPredictorEntries.getValue();
    this.facilityPredictors = JSON.parse(JSON.stringify(this.predictorDbService.facilityPredictors.getValue()));
    if (this.facilityPredictors.length == 0) {
      this.addPredictorEntry();
    }
  }

  async save() {
    this.loadingService.setLoadingMessage('Updating Predictors..')
    this.loadingService.setLoadingStatus(true);
    if (this.predictorEntries.length == 0) {
      this.predictorDbService.facilityPredictors.next(this.facilityPredictors);
    } else {
      await this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
    }
    this.analysisDbService.updateAnalysisPredictors(this.facilityPredictors);
    this.loadingService.setLoadingStatus(false);

    this.toastNoticationService.showToast("Predictors updated!", undefined, undefined, false, "bg-success");
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  deletePredictor(predictor: PredictorData) {
    this.predictorToDelete = predictor;
  }

  confirmDelete() {
    let deleteIndex: number = this.facilityPredictors.findIndex(facilityPredictor => { return facilityPredictor.id == this.predictorToDelete.id });
    this.facilityPredictors.splice(deleteIndex, 1);
    this.predictorToDelete = undefined;
  }

  cancelDelete() {
    this.predictorToDelete = undefined;
  }

  addPredictorEntry() {
    let newPredictor: PredictorData = this.predictorDbService.getNewPredictor(this.facilityPredictors);
    this.facilityPredictors.push(newPredictor);
  }
}
