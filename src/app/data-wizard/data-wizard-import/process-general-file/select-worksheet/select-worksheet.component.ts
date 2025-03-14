import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-select-worksheet',
  templateUrl: './select-worksheet.component.html',
  styleUrls: ['./select-worksheet.component.css'],
  standalone: false
})
export class SelectWorksheetComponent implements OnInit {


  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;
  fileReference: FileReference;

  paramsSub: Subscription;
  facilityOptions: Array<IdbFacility>;
  worksheetNames: Array<string>;
  hasHiddenTabs: boolean;
  showHiddenTabs: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private dataWizardService: DataWizardService,
    private router: Router, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.fileReferenceSub = this.dataWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.fileReferences.find(ref => { return ref.id == id });
      this.setWorksheetNames();
      this.facilityOptions = this.facilityDbService.accountFacilities.getValue();
      if (!this.fileReference.isTemplate) {
        if (this.fileReference.selectedWorksheetData.length == 0) {
          this.setSelectedWorksheetName();
        }
      }
    });
  }

  ngOnDestroy() {
    this.fileReferenceSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }

  setSelectedWorksheetName() {
    this.fileReference.selectedWorksheetData = XLSX.utils.sheet_to_json(this.fileReference.workbook.Sheets[this.fileReference.selectedWorksheetName], { header: 1 });
    if (this.fileReference.selectedWorksheetData.length != 0) {
      this.fileReference.selectedWorksheetData[0] = this.fileReference.selectedWorksheetData[0].map(item => { return item.trim() });
    }
    this.fileReference.headerMap = XLSX.utils.sheet_to_json(this.fileReference.workbook.Sheets[this.fileReference.selectedWorksheetName]).map(row =>
      Object.keys(row).reduce((obj, key) => {
        obj[key.trim()] = row[key];
        return obj;
      }, {})
    );
    this.fileReference.columnGroups = [];
  }

  setImportFacility() {
    this.fileReference.meterFacilityGroups = [];
    this.fileReference.predictorFacilityGroups = [];
    this.fileReference.newMeterGroups = [];
  }

  setWorksheetNames() {
    this.worksheetNames = new Array();
    if (this.fileReference.workbook) {
      this.hasHiddenTabs = this.fileReference.workbook.Workbook.Sheets.find(sheet => { return sheet.Hidden == 1 }) != undefined;
      this.fileReference.workbook.Workbook.Sheets.forEach(sheet => {
        if (sheet.Hidden == 0 || this.showHiddenTabs) {
          this.worksheetNames.push(sheet.name);
        }
      });
    }
  }

  setShowHidden(setVal: boolean) {
    this.showHiddenTabs = setVal;
    this.setWorksheetNames();
  }

  // next() {
  //   let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-general-file/' + this.fileReference.id + '/identify-columns');
  // }

  // goBack() {
  //   let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data');
  // }


}
