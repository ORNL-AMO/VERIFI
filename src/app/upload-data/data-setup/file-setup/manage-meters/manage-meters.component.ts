import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EditMeterFormService } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-manage-meters',
  templateUrl: './manage-meters.component.html',
  styleUrls: ['./manage-meters.component.css']
})
export class ManageMetersComponent implements OnInit {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  editMeterForm: FormGroup;
  editMeter: IdbUtilityMeter;
  editMeterFacility: IdbFacility;
  editMeterPrevGUID: string;
  metersIncluded: boolean;
  facilityGroups: Array<{
    facilityId: string,
    groupOptions: Array<IdbUtilityMeterGroup>
  }>;
  allMetersValid: boolean;
  calanderizeAllOnToggle: 'fullYear' | 'backward' | 'fullMonth' = 'fullMonth';
  hasNoCalanderizationSelection: boolean = false;
  skipAll: boolean = false;
  showExisting: boolean = false;
  existingMeterOptions: Array<IdbUtilityMeter> = [];
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private editMeterFormService: EditMeterFormService, private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

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
        this.setHasNoCalanderizationSelection();
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

  setEditMeter(meter: IdbUtilityMeter) {
    if (meter.id == undefined) {
      this.editMeterPrevGUID = meter.guid;
    }
    this.editMeter = this.fileReference.meters.find(fileMeter => { return fileMeter.guid == meter.guid });
    this.editMeterFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == meter.facilityId });
    this.editMeterForm = this.editMeterFormService.getFormFromMeter(meter);
  }

  cancelEdit() {
    this.editMeter = undefined;
    this.editMeterForm = undefined;
    this.editMeterFacility = undefined;
    this.editMeterPrevGUID = undefined;
  }

  submitMeter() {
    if (this.editMeter.guid != this.editMeterPrevGUID) {
      //need to update data meter id when changed.
      this.fileReference.meterData.forEach(mData => {
        if (mData.meterId == this.editMeterPrevGUID) {
          mData.guid = this.editMeter.guid;
        }
        if (!mData.heatCapacity) {
          mData.heatCapacity = this.editMeter.heatCapacity;
        }
        if (this.editMeter.scope == 2 && mData.vehicleFuelEfficiency) {
          mData.vehicleFuelEfficiency = this.editMeter.vehicleFuelEfficiency;
        }
      });
    }
    let editMeterIndex: number;
    if (this.editMeterPrevGUID) {
      editMeterIndex = this.fileReference.meters.findIndex(fileMeter => { return fileMeter.guid == this.editMeterPrevGUID });
    } else {
      editMeterIndex = this.fileReference.meters.findIndex(fileMeter => { return fileMeter.guid == this.editMeter.guid });
    }
    this.fileReference.meters[editMeterIndex] = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.editMeterForm);
    this.fileReference.meters[editMeterIndex].isValid = this.editMeterFormService.getFormFromMeter(this.fileReference.meters[editMeterIndex]).valid;
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
      let otherFuelGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Other Fuels' });
      if (!otherFuelGroup) {
        otherFuelGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", "Other Fuels", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(otherFuelGroup);
      }

      let otherEnergyGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Other Energy' });
      if (!otherEnergyGroup) {
        otherEnergyGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", "Other Energy", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(otherEnergyGroup);
      }

      let waterGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Water Intake' });
      if (!waterGroup) {
        waterGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Water", "Water Intake", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(waterGroup);
      }


      let wasteWaterGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Water Discharge' });
      if (!wasteWaterGroup) {
        wasteWaterGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Water", "Water Discharge", importFacility.guid, importFacility.accountId);
        facilityMeterGroups.push(wasteWaterGroup);
      }

      let otherGroup: IdbUtilityMeterGroup = facilityMeterGroups.find(group => { return group.name == 'Other' });
      if (!otherGroup) {
        otherGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Other", "Other (non-energy)", importFacility.guid, importFacility.accountId);
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
    // this.calanderizeAllOnToggle = !this.calanderizeAllOnToggle;
    this.fileReference.meters.forEach(meter => {
      if (this.calanderizeAllOnToggle == 'fullMonth') {
        meter.meterReadingDataApplication = 'backward';
      } else if (this.calanderizeAllOnToggle == 'backward') {
        meter.meterReadingDataApplication = 'fullYear';
      } else if (this.calanderizeAllOnToggle == 'fullYear') {
        meter.meterReadingDataApplication = 'fullMonth';
      }
    });
    if (this.calanderizeAllOnToggle == 'fullMonth') {
      this.calanderizeAllOnToggle = 'backward';
    } else if (this.calanderizeAllOnToggle == 'backward') {
      this.calanderizeAllOnToggle = 'fullYear';
    } else if (this.calanderizeAllOnToggle == 'fullYear') {
      this.calanderizeAllOnToggle = 'fullMonth';
    }
    this.setHasNoCalanderizationSelection();
  }

  autoGroup() {
    this.fileReference.meters.forEach(meter => {
      if (!meter.groupId) {
        let groupOptions: Array<IdbUtilityMeterGroup> = this.getFacilityMeterGroups(meter.facilityId);
        let findGroup: IdbUtilityMeterGroup = groupOptions.find(group => {
          if (meter.source == 'Electricity' && (meter.agreementType == 4 || meter.agreementType == 6)) {
            return group.name == 'Other (non-energy)';
          } else {
            return group.name == meter.source;
          }
        });
        if (findGroup) {
          meter.groupId = findGroup.guid;
        } else {
          findGroup = groupOptions.find(group => {
            return group.name == 'Other (non-energy)';
          });
          meter.groupId = findGroup.guid;
        }
      }
    });
  }

  setHasNoCalanderizationSelection() {
    let missingCalanderization: boolean = false;
    this.fileReference.meters.forEach(meter => {
      if (meter.meterReadingDataApplication == undefined) {
        missingCalanderization = true;
      }
    });
    this.hasNoCalanderizationSelection = missingCalanderization;
  }

  setSkipAll() {
    this.fileReference.meters.forEach(meter => {
      meter.skipImport = this.skipAll;
    });
    this.setValidMeters();
  }

  setShowExisting() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(aMeter => {
      return aMeter.facilityId == this.editMeter.facilityId;
    });
    let existingMetersInUse: Array<string> = this.fileReference.meters.flatMap(meter => {
      return meter.guid
    });
    this.existingMeterOptions = facilityMeters.filter(fMeter => {
      return !existingMetersInUse.includes(fMeter.guid);
    });
    this.showExisting = true;
  }


  selectExistingMeter(meter: IdbUtilityMeter) {
    let importWizardName: string = this.editMeter.importWizardName;
    this.editMeter = meter;
    this.editMeter.importWizardName = importWizardName;
    this.editMeterForm = this.editMeterFormService.getFormFromMeter(meter);
    this.showExisting = false;
  }
}
