import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-predictor-data',
  templateUrl: './predictor-data.component.html',
  styleUrls: ['./predictor-data.component.css']
})
export class PredictorDataComponent implements OnInit {

  page: number = 1;
  itemsPerPage: number = 12;
  pageSize: number;

  facilityPredictors: Array<PredictorData>;
  facilityPredictorsSub: Subscription;
  facilityPredictorEntries: Array<IdbPredictorEntry>;
  facilityPredictorEntriesSub: Subscription;

  predictorEntryToDelete: IdbPredictorEntry;
  predictorMenuOpenId: number;

  predictorEntryToEdit: IdbPredictorEntry;
  showPredictorMenu: boolean = false;
  showEditPredictors: boolean = false;
  showImportPredictors: boolean = false;
  constructor(private predictorsDbService: PredictordbService) { }

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

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage * (pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }

  predictorToggleMenu(toggleMenuId: number) {
    if (toggleMenuId == this.predictorMenuOpenId) {
      this.predictorMenuOpenId = undefined;
    } else {
      this.predictorMenuOpenId = toggleMenuId;
    }
  }

  addNewPredictor() {
    this.predictorsDbService.addNewPredictor();
  }

  addPredictorEntry() {
    this.predictorsDbService.addNewPredictorEntry();
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
    this.predictorMenuOpenId = undefined;
  }

  setEditPredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.predictorEntryToEdit = predictorEntry;
  }

  cancelEditPredictorEntry() {
    this.predictorEntryToEdit = undefined;
    this.predictorMenuOpenId = undefined;
  }

  predictorExport() {

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

  openImportPredictors(){
    this.showImportPredictors = true;
  }

  closeImportPredictors(){
    this.showImportPredictors = false;
  }
}
