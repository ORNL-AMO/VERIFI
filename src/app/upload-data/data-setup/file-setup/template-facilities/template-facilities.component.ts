import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
    selector: 'app-template-facilities',
    templateUrl: './template-facilities.component.html',
    styleUrls: ['./template-facilities.component.css'],
    standalone: false
})
export class TemplateFacilitiesComponent implements OnInit {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  accountFacilities: Array<IdbFacility>;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private facilityDbService: FacilitydbService, private router: Router) { }

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
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/manage-meters');
  }

}
