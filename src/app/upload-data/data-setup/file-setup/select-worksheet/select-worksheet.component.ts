import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-select-worksheet',
  templateUrl: './select-worksheet.component.html',
  styleUrls: ['./select-worksheet.component.css']
})
export class SelectWorksheetComponent implements OnInit {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSet: false,
    id: undefined,
    workbook: undefined,
    isTemplate: false,
    selectedWorksheetName: '',
    selectedWorksheetData: [],
    columnGroups: [],
    headerMap: [],
    meterFacilityGroups: [],
    predictorFacilityGroups: [],
    importFacilities: [],
    meters: [],
    meterData: []
  };
  paramsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      if (!this.fileReference.isTemplate) {
        if (this.fileReference.selectedWorksheetData.length == 0) {
          this.setSelectedWorksheetName();
        }
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  setSelectedWorksheetName() {
    this.fileReference.selectedWorksheetData = XLSX.utils.sheet_to_json(this.fileReference.workbook.Sheets[this.fileReference.selectedWorksheetName], { header: 1 });
    this.fileReference.headerMap = XLSX.utils.sheet_to_json(this.fileReference.workbook.Sheets[this.fileReference.selectedWorksheetName]);
    this.fileReference.columnGroups = [];
  }

  continue() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/identify-columns');
  }


}