import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-excel-data-table',
  templateUrl: './excel-data-table.component.html',
  styleUrls: ['./excel-data-table.component.css']
})
export class ExcelDataTableComponent implements OnInit {


  excelFilesSub: Subscription;
  excelFiles: Array<File>;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.excelFilesSub = this.uploadDataService.excelFiles.subscribe(val => {
      this.excelFiles = val;
      console.log(this.excelFiles);
    });
  }

  ngOnDestroy() {
    this.excelFilesSub.unsubscribe();
  }


  selectExcelFile(fileReference: File) {
    // this.uploadDataService.selectedExcelFile.next(fileReference);
  }
}
