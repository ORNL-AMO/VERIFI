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

  // addNewPredictor() {
  //   this.predictorsDbService.addNewPredictor();
  // }

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

  openImportPredictors() {
    this.showImportPredictors = true;
  }

  closeImportPredictors() {
    this.showImportPredictors = false;
  }
}
