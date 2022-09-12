import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EditMeterFormService } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-manage-meters',
  templateUrl: './manage-meters.component.html',
  styleUrls: ['./manage-meters.component.css']
})
export class ManageMetersComponent implements OnInit {

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
    skipExistingPredictorFacilityIds: []
  };
  paramsSub: Subscription;
  editMeterForm: FormGroup;
  editMeterIndex: number;
  editMeterFacility: IdbFacility;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private editMeterFormService: EditMeterFormService, private router: Router) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.fileReference.meters.forEach(meter => {
        let form: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
        meter.isValid = form.valid;
      });
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {
    let meterData: Array<IdbUtilityMeterData> = this.uploadDataService.parseExcelMeterData(this.fileReference);
    this.fileReference.meterData = meterData;
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-readings');
  }

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    return facility.name;
  }

  editMeter(meter: IdbUtilityMeter) {
    this.editMeterIndex = this.fileReference.meters.findIndex(fileMeter => { return fileMeter.guid == meter.guid });
    this.editMeterFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == meter.facilityId });
    this.editMeterForm = this.editMeterFormService.getFormFromMeter(meter);
  }

  cancelEdit() {
    this.editMeterForm = undefined;
    this.editMeterFacility = undefined;
    this.editMeterIndex = undefined;
  }

  submitMeter() {
    this.fileReference.meters[this.editMeterIndex] = this.editMeterFormService.updateMeterFromForm(this.fileReference.meters[this.editMeterIndex], this.editMeterForm);
    this.fileReference.meterData = this.uploadDataService.getMeterDataEntries(this.fileReference.workbook, this.fileReference.meters);
    this.cancelEdit();
  }

  goBack() {
    if(this.fileReference.isTemplate){
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/template-facilities');
    }else{
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/set-facility-meters');
    }
  }
}
