import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EditMeterFormService } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
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
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  paramsSub: Subscription;
  editMeterForm: FormGroup;
  editMeterIndex: number;
  editMeterFacility: IdbFacility;
  metersIncluded: boolean;
  facilityGroups: Array<{
    facilityId: string,
    groupOptions: Array<IdbUtilityMeterGroup>
  }>;
  allMetersValid: boolean;
  calanderizeAllOnToggle: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private editMeterFormService: EditMeterFormService, private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.metersIncluded = this.fileReference.meters.length != 0;
      if (this.metersIncluded) {
        this.setFacilityMeterGroups();
        this.fileReference.meters.forEach(meter => {
          let form: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
          meter.isValid = form.valid;
        });
        this.setValidMeters();
      } else {
        this.allMetersValid = true;
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {
    if (!this.fileReference.isTemplate && this.metersIncluded) {
      let meterData: Array<IdbUtilityMeterData> = this.uploadDataService.parseExcelMeterData(this.fileReference);
      this.fileReference.meterData = meterData;
    }
    if (this.metersIncluded) {
      let newGroups: Array<IdbUtilityMeterGroup> = new Array();
      this.fileReference.meters.forEach(meter => {
        if (meter.groupId) {
          let facilityGroups: Array<IdbUtilityMeterGroup> = this.getFacilityMeterGroups(meter.facilityId);
          let selectedGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.guid == meter.groupId });
          if (selectedGroup && !selectedGroup.id) {
            let groupExists: IdbUtilityMeterGroup = newGroups.find(group => { return group.guid == selectedGroup.guid });
            if (groupExists == undefined) {
              newGroups.push(selectedGroup);
            }
          }
        }
      });
      this.fileReference.newMeterGroups = newGroups;
    }

    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-readings');
  }

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    if (facility) {
      return facility.name;
    }
    return;
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
    this.fileReference.meters[this.editMeterIndex].isValid = this.editMeterFormService.getFormFromMeter(this.fileReference.meters[this.editMeterIndex]).valid;
    this.fileReference.meterData = this.uploadDataService.getMeterDataEntries(this.fileReference.workbook, this.fileReference.meters);
    this.cancelEdit();
    this.setValidMeters();
  }

  goBack() {
    if (this.fileReference.isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/template-facilities');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/set-facility-meters');
    }
  }

  getFacilityMeterGroups(facilityId: string): Array<IdbUtilityMeterGroup> {
    let facilityGroups: {
      facilityId: string,
      groupOptions: Array<IdbUtilityMeterGroup>
    } = this.facilityGroups.find(group => {
      return group.facilityId == facilityId;
    });
    if (facilityGroups) {
      return facilityGroups.groupOptions;
    } else {
      return [];
    }
  }

  setFacilityMeterGroups() {
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityGroups: Array<{
      facilityId: string,
      groupOptions: Array<IdbUtilityMeterGroup>
    }> = new Array();
    this.fileReference.importFacilities.forEach(importFacility => {
      let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(accountGroup => { return accountGroup.facilityId == importFacility.guid });
      let newImportGroups: Array<IdbUtilityMeterGroup> = this.fileReference.newMeterGroups.filter(newGroup => { return newGroup.facilityId == importFacility.guid });
      facilityMeterGroups = facilityMeterGroups.concat(newImportGroups);
      let electricityGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Electricity' });
      if (!electricityGroup) {
        electricityGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", "Electricity", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(electricityGroup);
      }
      let naturalGasGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Natural Gas' });
      if (!naturalGasGroup) {
        naturalGasGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", "Natural Gas", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(naturalGasGroup);
      }
      let otherFuelGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Other Fuel' });
      if (!otherFuelGroup) {
        otherFuelGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", "Other Fuel", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(otherFuelGroup);
      }

      let waterGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Water' });
      if (!waterGroup) {
        waterGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Water", "Water", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(waterGroup);
      }
      let otherGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Other' });
      if (!otherGroup) {
        otherGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Other", "Other", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(otherGroup);
      }


      facilityMeterGroups.push({
        guid: undefined,
        facilityId: undefined,
        accountId: undefined,
        //data
        groupType: undefined,
        name: "No Group",
      });
      facilityGroups.push({
        facilityId: importFacility.guid,
        groupOptions: facilityMeterGroups
      });
    });
    this.facilityGroups = facilityGroups;
    console.log(this.facilityGroups);
  }

  setValidMeters() {
    let isAllValid: boolean = true;
    this.fileReference.meters.forEach(meter => {
      if (!meter.isValid && !meter.skipImport) {
        isAllValid = false;
      }
    });
    this.allMetersValid = isAllValid;
  }

  toggleCalanderizeAll() {
    this.calanderizeAllOnToggle = !this.calanderizeAllOnToggle;
    this.fileReference.meters.forEach(meter => {
      if (this.calanderizeAllOnToggle) {
        meter.meterReadingDataApplication = 'backward';
      } else {
        meter.meterReadingDataApplication = 'fullMonth';
      }
    });
  }

  autoGroup() {
    this.fileReference.meters.forEach(meter => {
      if (!meter.groupId) {
        let groupOptions: Array<IdbUtilityMeterGroup> = this.getFacilityMeterGroups(meter.facilityId);
        let findGroup: IdbUtilityMeterGroup = groupOptions.find(group => {
          return group.name == meter.source;
        });
        if (findGroup) {
          meter.groupId = findGroup.guid;
        } else {
          findGroup = groupOptions.find(group => {
            return group.name == 'Other';
          });
          meter.groupId = findGroup.guid;
        }
      }
    });
  }
}
