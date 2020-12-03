import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-predictor-entry-row',
  templateUrl: './edit-predictor-entry-row.component.html',
  styleUrls: ['./edit-predictor-entry-row.component.css', '../predictor-data.component.css']
})
export class EditPredictorEntryRowComponent implements OnInit {
  @Input()
  predictorEntry: IdbPredictorEntry;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();


  predictorEntryCopy: IdbPredictorEntry;
  constructor(private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.predictorEntryCopy = JSON.parse(JSON.stringify(this.predictorEntry));
  }

  saveChanges() {
    this.predictorDbService.update(this.predictorEntryCopy);
    this.cancel();
  }

  setDate(eventData) {
    this.predictorEntryCopy.date = new Date(eventData);
  }

  cancel() {
    this.emitClose.emit(true);
  }
}
