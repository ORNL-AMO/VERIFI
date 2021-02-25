import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from '../../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { FuelTypeOption, SourceOptions } from '../../energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ImportMeterDataFileSummary } from '../import-meter-data.service';
import { ImportMeterFileSummary } from '../import-meter.service';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-import-meter-wizard',
  templateUrl: './import-meter-wizard.component.html',
  styleUrls: ['./import-meter-wizard.component.css']
})
export class ImportMeterWizardComponent implements OnInit {

  importError: boolean;
  importMeters: Array<IdbUtilityMeter>;
  selectedMeterForm: FormGroup;
  selectedMeterIndex: number;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;
  skipMeters: Array<boolean>;
  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string };
  constructor(private utilityMeterGroupdbService: UtilityMeterGroupdbService, private utilityMeterdbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private editMeterFormService: EditMeterFormService, private loadingService: LoadingService,
    private energyUseCalculationsService: EnergyUseCalculationsService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private accountdbService: AccountdbService, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.facilityMeters = this.utilityMeterdbService.facilityMeters.getValue();
    this.importMeterFileWizard = this.uploadDataService.importMeterFileWizard.getValue();
    this.importMeters = new Array();
    this.skipMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.newMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.importMeterFileWizard.importMeterFileSummary.existingMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.importMeterFileWizard.importMeterFileSummary.skippedMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(true);
    });
    this.importMeterFileWizard.importMeterFileSummary.invalidMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.selectMeter(this.importMeters[0], 0);
  }

  //will only return source if matches from our options
  // checkImportSource(source: string): string {
  //   let selectedSource: string = SourceOptions.find(sourceOption => { return sourceOption == source });
  //   return selectedSource;
  // }

  // checkImportPhase(phase: string): string {
  //   if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
  //     return phase;
  //   }
  //   return undefined;
  // }

  // checkImportStartingUnit(importUnit: string, source: string, phase: string, fuel: string): string {
  //   if (source) {
  //     let startingUnitOptions: Array<UnitOption> = this.energyUnitsHelperService.getStartingUnitOptions(source, phase, fuel);
  //     let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
  //     if (selectedUnitOption) {
  //       return selectedUnitOption.value;
  //     }
  //   }
  //   return undefined;
  // }

  // checkImportFuel(fuel: string, source: string, phase: string): string {
  //   let fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(source, phase);
  //   let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
  //   if (selectedEnergyOption) {
  //     return selectedEnergyOption.value;
  //   }
  //   return undefined;
  // }


  // async runImport() {
  //   this.loadingService.setLoadingStatus(true);
  //   this.loadingService.setLoadingMessage("Importing Meters...");
  //   let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
  //   let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();

  //   this.importMeters.forEach(meter => {
  //     if (meter.group) {
  //       let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
  //       let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
  //       if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
  //         let groupType: string = "Energy";
  //         if (meter.source == 'Water' || meter.source == 'Waste Water') {
  //           groupType = "Water"
  //         } else if (meter.source == 'Other Utility') {
  //           groupType = "Other"
  //         }
  //         let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup(groupType, meter.group, meter.facilityId, meter.accountId);
  //         uniqNeededGroups.push(utilityMeterGroup);
  //       }
  //     }
  //   });
  //   await uniqNeededGroups.forEach(neededGroup => {
  //     this.utilityMeterGroupdbService.addFromImport(neededGroup);
  //   });

  //   this.utilityMeterGroupdbService.setFacilityMeterGroups();
  //   this.setGroupIds();
  //   await this.importMeters.forEach((importMeter: IdbUtilityMeter, index: number) => {
  //     if (this.skipMeters[index] == false) {
  //       //check if meter already exists (same name)
  //       let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
  //       if (facilityMeter) {
  //         //update existing meter with form from import meter
  //         let form: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
  //         facilityMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, form);
  //         facilityMeter.energyUnit = this.getMeterEnergyUnit(form);
  //         //update
  //         this.utilityMeterdbService.updateWithObservable(facilityMeter);
  //       } else {
  //         //add
  //         let form: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
  //         importMeter.energyUnit = this.getMeterEnergyUnit(form);
  //         this.utilityMeterdbService.addWithObservable(importMeter);
  //       }
  //     }
  //   });
  //   let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   this.utilityMeterdbService.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityMeters => {
  //     this.utilityMeterdbService.facilityMeters.next(facilityMeters);
  //     let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
  //     this.utilityMeterdbService.getAllByIndexRange('accountId', selectedAccount.id).subscribe(facilityMeters => {
  //       this.utilityMeterdbService.accountMeters.next(facilityMeters);
  //       this.loadingService.setLoadingStatus(false);
  //       this.resetImport();
  //     });
  //   });
  // }

  // getMeterEnergyUnit(meterForm: FormGroup): string {
  //   let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meterForm.controls.startingUnit.value);
  //   if (isEnergyUnit) {
  //     return meterForm.controls.startingUnit.value;
  //   } else {
  //     let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meterForm.controls.source.value);
  //     if (isEnergyMeter) {
  //       let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //       return selectedFacility.energyUnit;
  //     } else {
  //       return undefined;
  //     }
  //   }
  // }

  // setGroupIds() {
  //   let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue()
  //   this.importMeters.forEach(meter => {
  //     let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
  //     if (existingGroup) {
  //       meter.groupId = existingGroup.id;
  //     }
  //   });
  // }

  resetImport() {
    this.importMeters = undefined;
    this.importError = false;
    // this.emitClose.emit(true);
  }

  selectMeter(meter: IdbUtilityMeter, meterIndex: number) {
    this.selectedMeterIndex = meterIndex;
    this.selectedMeterForm = this.editMeterFormService.getFormFromMeter(meter);
    this.selectedMeterForm.statusChanges.subscribe(val => {
      this.updateSelectedMeter();
    });
  }

  isMeterInvalid(meter: IdbUtilityMeter): boolean {
    return this.editMeterFormService.getFormFromMeter(meter).invalid;
  }

  hasInvalidMeter(): boolean {
    if (this.importMeters) {
      let invalidMeter: IdbUtilityMeter = this.importMeters.find((meter: IdbUtilityMeter, index: number) => {
        if (this.skipMeters[index] == false) {
          return this.isMeterInvalid(meter);
        }
      });
      if (invalidMeter) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  updateSelectedMeter() {
    this.importMeters[this.selectedMeterIndex] = this.editMeterFormService.updateMeterFromForm(this.importMeters[this.selectedMeterIndex], this.selectedMeterForm)
  }

  getBadgeClass(meter: IdbUtilityMeter, index: number): string {
    if (this.skipMeters[index] == true) {
      return 'badge-secondary';
    } else {
      let isMeterInvalid: boolean = this.isMeterInvalid(meter);
      if (isMeterInvalid) {
        return 'badge-danger';
      } else {
        let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == meter.name });
        if (facilityMeter) {
          return 'badge-warning';
        } else {
          return 'badge-success';
        }
      }
    }
  }

  toggleSkipMeter(index: number) {
    this.skipMeters[index] = !this.skipMeters[index];
  }


  cancel() {
    this.uploadDataService.importMeterFileWizard.next(undefined);
  }

  submit() {
    this.importMeterFileWizard.importMeterFileSummary.existingMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.newMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.invalidMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.skippedMeters = new Array();
    this.importMeters.forEach((meter, index) => {
      let badgeClass: string = this.getBadgeClass(meter, index);
      if (badgeClass == 'badge-secondary') {
        this.importMeterFileWizard.importMeterFileSummary.skippedMeters.push(meter);
      } else if (badgeClass == 'badge-danger') {
        this.importMeterFileWizard.importMeterFileSummary.invalidMeters.push(meter);
      } else if (badgeClass == 'badge-warning') {
        this.importMeterFileWizard.importMeterFileSummary.existingMeters.push(meter);
      } else if (badgeClass == 'badge-success') {
        this.importMeterFileWizard.importMeterFileSummary.newMeters.push(meter);
      }
    });
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }> = this.uploadDataService.importMeterFiles.getValue();
    let wizardFileIndex: number = importMeterFiles.findIndex(file => { return file.id == this.importMeterFileWizard.id });
    importMeterFiles[wizardFileIndex] = this.importMeterFileWizard;
    this.uploadDataService.importMeterFiles.next(importMeterFiles);
    this.cancel();
  }


}
