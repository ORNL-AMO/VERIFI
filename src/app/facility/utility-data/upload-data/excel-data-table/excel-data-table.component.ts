import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-excel-data-table',
  templateUrl: './excel-data-table.component.html',
  styleUrls: ['./excel-data-table.component.css']
})
export class ExcelDataTableComponent implements OnInit {


  excelFilesSub: Subscription;
  excelFiles: Array<File>;

  selectedExcelFile: File;
  constructor(private uploadDataService: UploadDataService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.excelFilesSub = this.uploadDataService.excelFiles.subscribe(val => {
      this.excelFiles = val;
    });
  }

  ngOnDestroy() {
    this.excelFilesSub.unsubscribe();
  }


  selectExcelFile(fileReference: File) {
    this.selectedExcelFile = fileReference;
    this.sharedDataService.modalOpen.next(true);
  }

  closeExcelWizard(){
    this.selectedExcelFile = undefined;
    this.sharedDataService.modalOpen.next(false);
  }
}
