import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { PredictorData } from 'src/app/models/idb';

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

  facilityPredictorsSub: Subscription;
  constructor(private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
      this.facilityPredictors = JSON.parse(JSON.stringify(this.predictorDbService.facilityPredictors.getValue()));
  }

  // ngOnDestroy() {
  //   this.facilityPredictorsSub.unsubscribe();
  // }

  save() {
    this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
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
