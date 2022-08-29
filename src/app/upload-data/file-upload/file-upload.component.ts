import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FileReference, UploadDataService } from '../upload-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  fileReferences: Array<FileReference>;
  disableImport: boolean = false;
  filesUploaded: boolean = false;
  constructor(private router: Router, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();
  }

  setImportFile(files: FileList) {
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            
            this.addFile(files[index]);
          }
        }
      }
    }
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
  }

  continue() {
    this.uploadDataService.fileReferences = this.fileReferences;
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id);
  }

  addFile(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
      this.fileReferences.push({
        name: file.name,
        file: file,
        dataSet: false,
        id: Math.random().toString(36).substr(2, 9),
        workbook: workBook,
        isTemplate: isTemplate,
        selectedWorksheetName: workBook.Workbook.Sheets[0].name,
        selectedWorksheetData: [],
        columnGroups: [],
        meterFacilityGroups: [],
        predictorFacilityGroups: [],
        headerMap: []
      });
    };
    reader.readAsBinaryString(file);
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Help" && sheetNames[1] == "Meters-Utilities" && sheetNames[2] == "Electricity" && sheetNames[3] == "Non-electricity" && sheetNames[4] == "Predictors") {
      return true;
    } else {
      return false;
    }
  }
}
