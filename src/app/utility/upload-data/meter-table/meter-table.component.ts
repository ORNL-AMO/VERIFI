import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImportMeterFileSummary } from '../import-meter.service';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-meter-table',
  templateUrl: './meter-table.component.html',
  styleUrls: ['./meter-table.component.css']
})
export class MeterTableComponent implements OnInit {

  importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>;
  importMeterFilesSub: Subscription;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.importMeterFilesSub = this.uploadDataService.importMeterFiles.subscribe(val => {
      this.importMeterFiles = val;
    });
  }

  ngOnDestroy(){
    this.importMeterFilesSub.unsubscribe();
  }

  selectMeterFile(selectedFile: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }){
    this.uploadDataService.importMeterFileWizard.next(selectedFile);
  }


}
