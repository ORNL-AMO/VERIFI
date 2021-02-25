import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CsvImportData, CsvToJsonService } from 'src/app/shared/helper-services/csv-to-json.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ImportMeterService, ImportMeterFileSummary } from './import-meter.service';
import { ElectricityMeterDataHeaders, MeterHeaders, NonElectricityMeterDataHeaders } from './templateHeaders';
import * as XLSX from 'xlsx';
import { UploadDataService } from './upload-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary };
  importMeterFileWizardSub: Subscription;

  fileReferences: Array<any>;
  constructor(private csvToJsonService: CsvToJsonService, private loadingService: LoadingService,
    private importMeterService: ImportMeterService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.initArrays();

    this.importMeterFileWizardSub = this.uploadDataService.importMeterFileWizard.subscribe(val => {
      this.importMeterFileWizard = val;
    });
  }

  ngOnDestroy(){
    this.importMeterFileWizardSub.unsubscribe();
  }

  initArrays() {
    this.fileReferences = new Array();
  }

  setImportFile(files: FileList) {
    this.initArrays();
    if (files) {
      if (files.length !== 0) {
        let regex = /.csv$/;
        let regex2 = /.CSV$/;
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex.test(files[index].name) || regex2.test(files[index].name) || regex3.test(files[index].name)) {
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

      // } else {
      //   let fr: FileReader = new FileReader();
      //   fr.readAsText(fileReference);
      //   fr.onloadend = (e) => {
      //     let importData: any = JSON.parse(JSON.stringify(fr.result));
      //     let fileHeaders: Array<string> = this.csvToJsonService.parseCsvHeaders(importData);
      //     this.addFile(importData, fileHeaders, fileReference.name);
      //   };

      // }
    })
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Meters-Utilities" && sheetNames[1] == "Electricity" && sheetNames[2] == "Non-electricity" && sheetNames[3] == "HIDE") {
      return true;
    } else {
      return false;
    }
  }


  // addFile(data: any, fileHeaders: Array<string>, fileName: string) {
  //   if (JSON.stringify(fileHeaders) === JSON.stringify(MeterHeaders)) {
  //     this.addMeterFile(data, fileName);
  //   } else if (JSON.stringify(fileHeaders) === JSON.stringify(ElectricityMeterDataHeaders)) {
  //     //electricity meter data template 
  //     // this.filesSummary.push({
  //     //   fileType: 'Meter Data',
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //     this.uploadDataService.addMeterDataFile(fileName, 'Electricity');
  //   } else if (JSON.stringify(fileHeaders) === JSON.stringify(NonElectricityMeterDataHeaders)) {
  //     //non electricity meter data template
  //     // this.filesSummary.push({
  //     //   fileType: 'Meter Data',
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //     this.uploadDataService.addMeterDataFile(fileName, 'Non-Electricity');
  //   } else {
  //     //other .csv file
  //     // this.nonTemplateFiles.push({
  //     //   fileType: undefined,
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //   }

  // }

  addMeterFile(data: any, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let fileData: CsvImportData = this.csvToJsonService.parseCsvWithHeaders(data, 0);
    let summary: ImportMeterFileSummary = this.importMeterService.importMetersFromDataFile(fileData, selectedFacility, facilityMeters)
    this.uploadDataService.addMeterFile(fileName, summary);
  }
}
