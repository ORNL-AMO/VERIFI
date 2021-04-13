import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-predictor-data',
  templateUrl: './predictor-data.component.html',
  styleUrls: ['./predictor-data.component.css']
})
export class PredictorDataComponent implements OnInit {

  itemsPerPage: number = 6;
  currentPageNumber: number = 1;

  facilityPredictors: Array<PredictorData>;
  facilityPredictorsSub: Subscription;
  facilityPredictorEntries: Array<IdbPredictorEntry>;
  facilityPredictorEntriesSub: Subscription;

  predictorEntryToDelete: IdbPredictorEntry;

  predictorEntryToEdit: IdbPredictorEntry;
  showPredictorMenu: boolean = false;
  showEditPredictors: boolean = false;
  addOrEdit: "add" | "edit";
  constructor(private predictorsDbService: PredictordbService, private router: Router) { }

  ngOnInit(): void {
    this.facilityPredictorsSub = this.predictorsDbService.facilityPredictors.subscribe(predictors => {
      this.facilityPredictors = predictors;
    });

    this.facilityPredictorEntriesSub = this.predictorsDbService.facilityPredictorEntries.subscribe(entries => {
      this.facilityPredictorEntries = entries;
    })
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.facilityPredictorEntriesSub.unsubscribe();
  }

  addPredictorEntry() {
    this.addOrEdit = "add";
    this.predictorEntryToEdit = this.predictorsDbService.getNewPredictorEntry();
  }

  setDeletePredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.predictorEntryToDelete = predictorEntry;
  }

  confirmDeletePredictorEntry() {
    this.predictorsDbService.deleteById(this.predictorEntryToDelete.id);
    this.cancelDeletePredictorEntry();
  }

  cancelDeletePredictorEntry() {
    this.predictorEntryToDelete = undefined;
  }

  setEditPredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.addOrEdit = "edit";
    this.predictorEntryToEdit = predictorEntry;
  }

  cancelEditPredictorEntry() {
    this.predictorEntryToEdit = undefined;
  }

  togglePredictorMenu() {
    this.showPredictorMenu = !this.showPredictorMenu;
  }

  editPredictors() {
    this.showEditPredictors = true;
  }

  closeEditPredictors() {
    this.showEditPredictors = false;
    this.showPredictorMenu = false;
  }

  uploadData() {
    this.router.navigateByUrl('utility/upload-data');
  }
}
