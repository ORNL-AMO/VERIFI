import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';

@Component({
  selector: 'app-process-template-facilities',
  templateUrl: './process-template-facilities.component.html',
  styleUrl: './process-template-facilities.component.css'
})
export class ProcessTemplateFacilitiesComponent {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSubmitted: false,
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
    meterData: [],
    predictorEntries: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  // paramsSub: Subscription;
  // accountFacilities: Array<IdbFacility>;
  constructor(private activatedRoute: ActivatedRoute, private setupWizardService: SetupWizardService,
    private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    console.log('init..');
    // this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.setupWizardService.fileReferences.getValue().find(ref => { return ref.id == id });
    });
  }

  ngOnDestroy() {
    // this.paramsSub.unsubscribe();
  }
}
