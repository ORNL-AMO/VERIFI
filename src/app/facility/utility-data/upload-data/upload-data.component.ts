import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ImportMeterFileSummary } from './import-meter.service';
import * as XLSX from 'xlsx';
import { ImportMeterDataFile, ImportPredictorFile, UploadDataService } from './upload-data.service';
import { Subscription } from 'rxjs';
import { ImportMeterDataFileSummary } from './import-meter-data.service';
import { UploadDataRunnerService } from './upload-data-runner.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  @ViewChild("importFile")
  importFile: ElementRef;

  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary };
  importMeterFileWizardSub: Subscription;
  importMeterDataFileWizard: ImportMeterDataFile;
  importMeterDataFileWizardSub: Subscription;

  fileReferences: Array<any>;
  filesUploaded: boolean = false;

  importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>;
  importMeterFilesSub: Subscription;
  importMeterDataFiles: Array<ImportMeterDataFile>;
  importMeterDataFilesSub: Subscription;
  importPredictorFiles: Array<ImportPredictorFile>;
  importPredictorFilesSub: Subscription;
  disableImport: boolean = true;

  importPredictorFileWizard: ImportPredictorFile;
  importPredictorFileWizardSub: Subscription;

  constructor(private uploadDataService: UploadDataService, private uploadDataRunnerService: UploadDataRunnerService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();

    this.importMeterFileWizardSub = this.uploadDataService.importMeterFileWizard.subscribe(val => {
      this.importMeterFileWizard = val;
      this.checkModalOpen();
    });

    this.importMeterDataFileWizardSub = this.uploadDataService.importMeterDataFileWizard.subscribe(val => {
      this.importMeterDataFileWizard = val;
      this.checkModalOpen();
    });

    this.importPredictorFileWizardSub = this.uploadDataService.importPredictorFileWizard.subscribe(val => {
      this.importPredictorFileWizard = val;
      this.checkModalOpen();
    });

    this.importMeterFilesSub = this.uploadDataService.importMeterFiles.subscribe(val => {
      this.importMeterFiles = val;
      this.checkDataToImport();
    });

    this.importMeterDataFilesSub = this.uploadDataService.importMeterDataFiles.subscribe(val => {
      this.importMeterDataFiles = val;
      this.checkDataToImport();
    });

    this.importPredictorFilesSub = this.uploadDataService.importPredictorsFiles.subscribe(val => {
      this.importPredictorFiles = val;
      this.checkDataToImport();
    })
  }

  ngOnDestroy() {
    this.importMeterFileWizardSub.unsubscribe();
    this.importMeterDataFileWizardSub.unsubscribe();
    this.importMeterFilesSub.unsubscribe();
    this.importMeterDataFilesSub.unsubscribe();
    this.importPredictorFilesSub.unsubscribe();
    this.importPredictorFileWizardSub.unsubscribe();
    this.uploadDataService.resetData();
  }

  resetData() {
    this.uploadDataService.resetData();
    this.fileReferences = new Array();
    this.filesUploaded = false;
    this.importFile.nativeElement.value = ""
  }

  setImportFile(files: FileList) {
    this.fileReferences = new Array();
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            this.fileReferences.push(files[index]);
          }
        }
        if (this.fileReferences.length != 0) {
          this.importFiles();
        }
      }
    }
  }

  importFiles() {
    this.fileReferences.forEach(fileReference => {
      let excelTest = /.xlsx$/;
      if (excelTest.test(fileReference.name)) {
        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
          /* read workbook */
          const bstr: string = e.target.result;
          let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
          let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
          if (isTemplate) {
            this.uploadDataService.addTemplateWorkBook(workBook, fileReference.name);
          } else {
            this.uploadDataService.addExcelFile(fileReference);
          }
        };
        reader.readAsBinaryString(fileReference);
      }
    });
    this.filesUploaded = true;
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Help" && sheetNames[1] == "Meters-Utilities" && sheetNames[2] == "Electricity" && sheetNames[3] == "Non-electricity" && sheetNames[4] == "Predictors" && sheetNames[5] == "HIDE") {
      return true;
    } else {
      return false;
    }
  }

  importData() {
    this.uploadDataRunnerService.importData();
  }

  checkDataToImport() {
    this.disableImport = true;
    if (this.importMeterDataFiles) {
      this.importMeterDataFiles.forEach(file => {
        if (file.importMeterDataFileSummary.newMeterData.length != 0) {
          this.disableImport = false;
        }
        if (!file.skipExisting && file.importMeterDataFileSummary.existingMeterData.length != 0) {
          this.disableImport = false;
        }
      });
    }
    if (this.disableImport && this.importMeterFiles) {
      this.importMeterFiles.forEach(file => {
        if (file.importMeterFileSummary.existingMeters.length != 0) {
          this.disableImport = false;
        }
        if (file.importMeterFileSummary.newMeters.length != 0) {
          this.disableImport = false;
        }
      });
    }
    if (this.disableImport && this.importPredictorFiles) {
      this.importPredictorFiles.forEach(file => {
        if (file.importPredictorFileSummary.existingPredictors.length != 0) {
          this.disableImport = false;
        }
        if (file.importPredictorFileSummary.newPredictors.length != 0) {
          this.disableImport = false;
        }
      });
    }
  }

  checkModalOpen(){
    if(this.importMeterFileWizard || this.importMeterDataFileWizard || this.importPredictorFileWizard){
      this.sharedDataService.modalOpen.next(true);
    }else{
      this.sharedDataService.modalOpen.next(false);
    }
  }
}
