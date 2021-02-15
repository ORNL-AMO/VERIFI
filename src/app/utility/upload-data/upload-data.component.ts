import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CsvImportData, CsvToJsonService } from 'src/app/shared/helper-services/csv-to-json.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ImportMeterService, ImportMeterFileSummary } from './import-meter.service';
import { ElectricityMeterDataHeaders, MeterHeaders, NonElectricityMeterDataHeaders } from './templateHeaders';
import * as XLSX from 'xlsx';

type AOA = any[][];

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }>;


  filesSummary: Array<{ fileType: string, fileData: CsvImportData, fileName: string }>;
  fileReferences: Array<any>;
  nonTemplateFiles: Array<{ fileType: string, fileData: CsvImportData, fileName: string }>;
  inputLabel: string = 'Browse Files'

  excelFiles: Array<any>;

  constructor(private csvToJsonService: CsvToJsonService, private loadingService: LoadingService,
    private importMeterService: ImportMeterService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.initArrays();
  }

  initArrays() {
    this.importMeterFiles = new Array();
    this.filesSummary = new Array();
    this.nonTemplateFiles = new Array();
    this.excelFiles = new Array();
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
          const element = files[index];
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
        this.excelFiles.push(fileReference);
      } else {
        let fr: FileReader = new FileReader();
        fr.readAsText(fileReference);
        fr.onloadend = (e) => {
          let importData: any = JSON.parse(JSON.stringify(fr.result));
          let fileHeaders: Array<string> = this.csvToJsonService.parseCsvHeaders(importData);
          this.addFile(importData, fileHeaders, fileReference.name);
        };

      }
    })
  }


  addFile(data: any, fileHeaders: Array<string>, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    if (JSON.stringify(fileHeaders) === JSON.stringify(MeterHeaders)) {
      let fileData: CsvImportData = this.csvToJsonService.parseCsvWithHeaders(data, 0);
      let summary: ImportMeterFileSummary = this.importMeterService.importMetersFromDataFile(fileData, selectedFacility, facilityMeters)
      //meter template
      this.importMeterFiles.push({
        fileName: fileName,
        importMeterFileSummary: summary
      });

    } else if (JSON.stringify(fileHeaders) === JSON.stringify(ElectricityMeterDataHeaders)) {
      //electricity meter data template 
      this.filesSummary.push({
        fileType: 'Meter Data',
        fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
        fileName: fileName
      });

    } else if (JSON.stringify(fileHeaders) === JSON.stringify(NonElectricityMeterDataHeaders)) {
      //non electricity meter data template
      this.filesSummary.push({
        fileType: 'Meter Data',
        fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
        fileName: fileName
      });

    } else {
      //other .csv file
      this.nonTemplateFiles.push({
        fileType: undefined,
        fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
        fileName: fileName
      });
    }

  }


  // parsePreviewData() {
  //   this.previewDataFromCsv = this.csvToJsonService.parseCsvWithoutHeaders(this.importData);
  // }

  // parseImportData() {
  //   this.loadingService.setLoadingMessage('Parsing CSV');
  //   this.loadingService.setLoadingStatus(true);
  //   this.importingData = true;
  //   this.previewDataFromCsv = undefined;
  //   this.importDataFromCsv = this.csvToJsonService.parseCsvWithHeaders(this.importData, Number(this.selectedHeaderRow));
  //   this.importSuccesful = true;
  //   this.importData = undefined;
  //   this.loadingService.setLoadingStatus(false);
  //   this.loadingService.setLoadingMessage(undefined);
  // }

  data: AOA = [[1, 2], [3, 4]];
  wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };
  fileName: string = 'SheetJS.xlsx';

  onFileChange(evt: any) {
    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });

      /* grab first sheet */
      const wsname: string = wb.SheetNames[1];
      const ws: XLSX.WorkSheet = wb.Sheets["Sheet1"];
      var csv = XLSX.utils.sheet_to_csv(wb.Sheets["Sheet1"]);
      console.log(csv)
      var XL_row_object = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { header: 1 });
      console.log(XL_row_object);


      /* save data */
      this.data = <AOA>(XL_row_object);
    };
    reader.readAsBinaryString(target.files[0]);
  }

}
