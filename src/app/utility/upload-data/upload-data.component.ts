import { Component, OnInit } from '@angular/core';
import { CsvImportData, CsvToJsonService } from 'src/app/shared/helper-services/csv-to-json.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  fileReference: any;
  validFile: boolean;
  importData: any = null;
  previewDataFromCsv: CsvImportData;
  importDataFromCsv: CsvImportData;
  importingData: boolean = false;
  importSuccesful: boolean = false;
  selectedHeaderRow: number;
  constructor(private csvToJsonService: CsvToJsonService, private loadingService: LoadingService) { }

  ngOnInit(): void {
  }

  setImportFile(files: FileList) {
    if (files) {
      if (files.length !== 0) {
        let regex = /.csv$/;
        let regex2 = /.CSV$/;
        if (regex.test(files[0].name) || regex2.test(files[0].name)) {
          this.fileReference = files[0];
          this.validFile = true;
          this.importFile();
        } else {
          this.validFile = false;
        }
      }
    }
  }

  importFile() {
    let fr: FileReader = new FileReader();
    fr.readAsText(this.fileReference);
    fr.onloadend = (e) => {
      this.importData = JSON.parse(JSON.stringify(fr.result));
      let test = this.csvToJsonService.parseCsvHeaders(this.importData);
      console.log(test);
    };
  }


  parsePreviewData() {
    this.previewDataFromCsv = this.csvToJsonService.parseCsvWithoutHeaders(this.importData);
  }

  parseImportData() {
    this.loadingService.setLoadingMessage('Parsing CSV');
    this.loadingService.setLoadingStatus(true);
    this.importingData = true;
    this.previewDataFromCsv = undefined;
    this.importDataFromCsv = this.csvToJsonService.parseCsvWithHeaders(this.importData, Number(this.selectedHeaderRow));
    this.importSuccesful = true;
    this.importData = undefined;
    this.loadingService.setLoadingStatus(false);
    this.loadingService.setLoadingMessage(undefined);
  }

}
