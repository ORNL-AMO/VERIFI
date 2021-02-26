import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImportMeterDataFileSummary } from '../import-meter-data.service';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-meter-data-table',
  templateUrl: './meter-data-table.component.html',
  styleUrls: ['./meter-data-table.component.css']
})
export class MeterDataTableComponent implements OnInit {

  importMeterDataFiles: Array<{ fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, id: string, isTemplateElectricity: boolean }>;
  importMeterDataFilesSub: Subscription;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.importMeterDataFilesSub = this.uploadDataService.importMeterDataFiles.subscribe(val => {
      this.importMeterDataFiles = val;
    });
  }

  ngOnDestroy() {
    this.importMeterDataFilesSub.unsubscribe();
  }


  selectMeterDataFile(dataFile: { fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, id: string, isTemplateElectricity: boolean }) {
    this.uploadDataService.importMeterDataFileWizard.next(dataFile);
  }
}
