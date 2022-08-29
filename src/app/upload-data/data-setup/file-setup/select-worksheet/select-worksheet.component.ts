import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    predictorFacilityGroups: []
  };
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      console.log(id);
      console.log(this.uploadDataService.fileReferences);
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      console.log(this.fileReference)
      if(this.fileReference.selectedWorksheetData.length == 0){
        this.setSelectedWorksheetName();
      }
    });
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
