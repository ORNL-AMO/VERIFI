import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';
import { FuelTypeOption, SourceOptions } from '../edit-meter-form/editMeterOptions';

@Component({
  selector: 'app-import-meter-wizard',
  templateUrl: './import-meter-wizard.component.html',
  styleUrls: ['./import-meter-wizard.component.css']
})
export class ImportMeterWizardComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: boolean;
  importMeters: Array<IdbUtilityMeter>;
  selectedMeterForm: FormGroup;
  selectedMeterIndex: number;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;
  skipMeters: Array<boolean>;
  constructor(private utilityMeterGroupdbService: UtilityMeterGroupdbService, private utilityMeterdbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private editMeterFormService: EditMeterFormService, private loadingService: LoadingService,
    private energyUseCalculationsService: EnergyUseCalculationsService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterdbService.facilityMeters.subscribe(val => {
      this.facilityMeters = val;
    })
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }

  meterImport(files: FileList) {
    this.importMeters = new Array();
    this.skipMeters = new Array();
    if (files && files.length > 0) {
      let file: File = files.item(0);
      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].replace('\r', '').split(",");
        const allowedHeaders: Array<string> = ["Meter Number", "Account Number", "Source", "Meter Name", "Utility Supplier", "Notes", "Building / Location", "Meter Group", "Collection Unit", "Phase", "Fuel", "Heat Capacity", "Site To Source"];
        if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {
          this.importError = false;
          let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
          for (var i = 1; i < lines.length - 1; i++) {
            let currentLine: Array<string> = lines[i].split(",");
            let newImportMeter: IdbUtilityMeter = this.getNewMeterFromCurrentLine(currentLine, selectedFacility);
            this.importMeters.push(newImportMeter);
            this.skipMeters.push(false);
            if (i == 1) {
              this.selectMeter(newImportMeter, 0);
            }
          }
        } else {
          this.importError = true;
        }
      }
    }
  }

  getNewMeterFromCurrentLine(currentLine: Array<string>, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId);
    newMeter.meterNumber = currentLine[0];
    newMeter.accountNumber = Number(currentLine[1]);
    newMeter.source = this.checkImportSource(currentLine[2]);
    newMeter.phase = this.checkImportPhase(currentLine[9]);
    newMeter.name = currentLine[3];
    newMeter.supplier = currentLine[4];
    newMeter.notes = currentLine[5];
    newMeter.location = currentLine[6];
    newMeter.group = currentLine[7];
    newMeter.fuel = currentLine[10];
    newMeter.startingUnit = this.checkImportStartingUnit(currentLine[8], newMeter.source, newMeter.phase, newMeter.fuel);
    if (currentLine[11] != '') {
      newMeter.heatCapacity = Number(currentLine[11]);
    }
    if (Number(currentLine[12]) != 0) {
      newMeter.siteToSource = Number(currentLine[12]);
    }
    return newMeter;
  }

  //will only return source if matches from our options
  checkImportSource(source: string): string {
    let selectedSource: string = SourceOptions.find(sourceOption => { return sourceOption == source });
    return selectedSource;
  }

  checkImportPhase(phase: string): string {
    if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
      return phase;
    }
    return undefined;
  }

  checkImportStartingUnit(importUnit: string, source: string, phase: string, fuel: string): string {
    if (source) {
      let startingUnitOptions: Array<UnitOption> = this.energyUnitsHelperService.getStartingUnitOptions(source, phase, fuel);
      let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
      if (selectedUnitOption) {
        return selectedUnitOption.value;
      }
    }
    return undefined;
  }

  checkImportFuel(fuel: string, source: string, phase: string): string {
    let fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(source, phase);
    let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
    if (selectedEnergyOption) {
      return selectedEnergyOption.value;
    }
    return undefined;
  }


  runImport() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Adding Meters...");
    this.checkImportMeterGroups();
    this.setGroupIds();
    this.addMeters();
    this.utilityMeterdbService.setAccountMeters();
    this.utilityMeterdbService.setFacilityMeters();
    this.loadingService.setLoadingStatus(false);
    this.resetImport();
  }

  async checkImportMeterGroups() {
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
    let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();

    this.importMeters.forEach(meter => {
      if (meter.group) {
        let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
        let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
        if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
          let groupType: string = "Energy";
          if (meter.source == 'Water' || meter.source == 'Waste Water') {
            groupType = "Water"
          } else if (meter.source == 'Other Utility') {
            groupType = "Other"
          }
          let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup(groupType, meter.group, meter.facilityId, meter.accountId);
          uniqNeededGroups.push(utilityMeterGroup);
        }
      }
    });
    await uniqNeededGroups.forEach(neededGroup => {
      this.utilityMeterGroupdbService.addFromImport(neededGroup);
    });
    this.utilityMeterGroupdbService.setFacilityMeterGroups();
  }

  setGroupIds() {
    let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue()
    this.importMeters.forEach(meter => {
      let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
      if (existingGroup) {
        meter.groupId = existingGroup.id;
      }
    });
  }

  async addMeters() {
    await this.importMeters.forEach((importMeter: IdbUtilityMeter, index: number) => {
      if (this.skipMeters[index] == false) {
        //check if meter already exists (same name)
        let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
        if (facilityMeter) {
          //update existing meter with form from import meter
          let form: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
          facilityMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, form);
          //update
          this.utilityMeterdbService.updateWithObservable(facilityMeter);
        } else {
          //add
          this.utilityMeterdbService.addWithObservable(importMeter);
        }
      }
    });
  }

  resetImport() {
    this.importMeters = undefined;
    this.importError = false;
    this.emitClose.emit(true);
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
}
