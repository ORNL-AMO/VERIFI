import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

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
  constructor(private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.predictorEntries = this.predictorDbService.facilityPredictorEntries.getValue();
    this.facilityPredictors = JSON.parse(JSON.stringify(this.predictorDbService.facilityPredictors.getValue()));
    if(this.facilityPredictors.length == 0){
      this.addPredictorEntry();
    }
  }

  async save() {
    if(this.predictorEntries.length == 0){
      this.predictorDbService.facilityPredictors.next(this.facilityPredictors);
    }else{
      await this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
    }
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
