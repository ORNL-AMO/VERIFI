import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { LoadingService } from 'src/app/shared/loading/loading.service';

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
  allChecked: boolean = false;
  hasCheckedItems: boolean = false;
  showBulkDelete: boolean = false;
  constructor(private predictorsDbService: PredictordbService, private router: Router, private loadingService: LoadingService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilityPredictorsSub = this.predictorsDbService.facilityPredictors.subscribe(predictors => {
      this.facilityPredictors = predictors;
    });

    this.facilityPredictorEntriesSub = this.predictorsDbService.facilityPredictorEntries.subscribe(entries => {
      this.facilityPredictorEntries = entries;
      this.setHasChecked();
    });
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

  predictorExport() {
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = this.facilityPredictors.map(predictor => { return predictor.name });

    header.unshift('Month/Year');
    let csvData: Array<string> = new Array();
    this.facilityPredictorEntries.forEach(entry => {
      let dataRow: Array<any> = new Array();
      let predictorVals: Array<number> = entry.predictors.map(predictor => { return predictor.amount });
      dataRow = dataRow.concat(predictorVals);
      let entryDate: Date = new Date(entry.date);
      dataRow.unshift((entryDate.getMonth() + 1) + '/' + entryDate.getFullYear());
      csvData.push(JSON.stringify(dataRow, replacer));
    });

    csvData = csvData.map(dataRow => {
      dataRow = dataRow.replace(/\\r/, '');
      dataRow = dataRow.replace('[', '');
      dataRow = dataRow.replace(']', '');
      return dataRow;
    });
    csvData.unshift(header.join(','));
    let csvBlob: BlobPart = csvData.join('\r\n');

    //Download the file as CSV
    var downloadLink = document.createElement("a");
    var blob = new Blob(["\ufeff", csvBlob]);
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "VerifiPredictorDump.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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

  checkAll(){
    let displayedItems: Array<IdbPredictorEntry>  = this.facilityPredictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      item.checked = this.allChecked;
    });
    this.hasCheckedItems = (this.allChecked == true);
  }

  setHasChecked(){
    let hasChecked: boolean = false;
    let displayedItems: Array<IdbPredictorEntry>  = this.facilityPredictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      if(item.checked){
        hasChecked = true;
      }
    });
    this.hasCheckedItems = hasChecked;
  }

  openBulkDelete(){
    this.showBulkDelete = true;
  }

  cancelBulkDelete(){
    this.showBulkDelete = false;
  }

  async bulkDelete(){
    this.loadingService.setLoadingMessage("Deleting Predictor Entries...");
    this.loadingService.setLoadingStatus(true);
    let displayedItems: Array<IdbPredictorEntry> = this.facilityPredictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    for(let index = 0; index < displayedItems.length; index++){
      await this.predictorsDbService.deleteIndexWithObservable(displayedItems[index].id).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountPredictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.predictorsDbService.accountPredictorEntries.next(accountPredictors);
    let facilityPredictors: Array<IdbPredictorEntry> = accountPredictors.filter(predictor => {return predictor.facilityId == selectedFacility.id});
    this.predictorsDbService.facilityPredictorEntries.next(facilityPredictors);
    this.allChecked = false;
    this.loadingService.setLoadingStatus(false);
    this.cancelBulkDelete();
  }
}
