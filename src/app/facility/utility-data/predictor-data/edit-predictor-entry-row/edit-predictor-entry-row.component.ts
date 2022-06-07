import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';

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
  @Input()
  addOrEdit: "add" | "edit";


  predictorEntryCopy: IdbPredictorEntry;
  constructor(private predictorDbService: PredictordbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.predictorEntryCopy = JSON.parse(JSON.stringify(this.predictorEntry));
  }

  async saveChanges() {
    if (this.addOrEdit == "edit") {
      await this.predictorDbService.updateWithObservable(this.predictorEntryCopy).toPromise();
    } else {
      await this.predictorDbService.addWithObservable(this.predictorEntryCopy).toPromise();
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictors(selectedAccount, selectedFacility);
    this.cancel();
  }

  setDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.predictorEntryCopy.date = new Date(Number(yearMonth[0]), Number(yearMonth[1])-1, 1);
  }

  cancel() {
    this.emitClose.emit(true);
  }
}
