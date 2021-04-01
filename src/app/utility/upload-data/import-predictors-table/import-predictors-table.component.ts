import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImportPredictorFile, UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-import-predictors-table',
  templateUrl: './import-predictors-table.component.html',
  styleUrls: ['./import-predictors-table.component.css']
})
export class ImportPredictorsTableComponent implements OnInit {

  importPredictorFiles: Array<ImportPredictorFile>;
  importPredictorFilesSub: Subscription;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.importPredictorFilesSub = this.uploadDataService.importPredictorsFiles.subscribe(val => {
      this.importPredictorFiles = val;
      console.log(this.importPredictorFiles);
    });
  }

  ngOnDestroy() {
    this.importPredictorFilesSub.unsubscribe();
  }
}
