import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-template-facilities',
  templateUrl: './template-facilities.component.html',
  styleUrls: ['./template-facilities.component.css']
})
export class TemplateFacilitiesComponent implements OnInit {

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
  accountFacilities: Array<IdbFacility>;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }


  continue(){

  }

}