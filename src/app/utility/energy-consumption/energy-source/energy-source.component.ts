import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { EnergyConsumptionService } from '../energy-consumption.service';
import { AccountService } from "../../../account/account/account.service";
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db-service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../../utility/utility.service";
import { UtilityMeterDatadbService } from "../../../indexedDB/utilityMeterData-db-service";
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";
import { UtilityMeterGroupdbService } from "../../../indexedDB/utilityMeterGroup-db.service";
import { listAnimation } from '../../../animations';
import { ConvertUnitsService } from '../../../shared/convert-units/convert-units.service';
import { IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css'],
  animations: [
    listAnimation
  ],
  host: {
    '(document:click)': 'documentClick($event)',
  }
})
export class EnergySourceComponent implements OnInit {
  accountid: number;
  facilityid: number;
  activeFacility: any = { name: '' };

  meterMenuOpen: number;
  window: boolean = false;
  popup: boolean = false;
  id: number;

  energySources: any;
  selectedMeter: any;
  meterList: any = [{ type: '' }];
  energyFinalUnit: string;

  importWindow: boolean = false;
  importError: string = '';
  quickView: any = [];
  import: any = [];
  toggleCancel: boolean = false; // Used to prevent "Cancel" when Adding New Meter (Cancel leaves the meter blank)

  page = 1;
  itemsPerPage = 10;
  pageSize: number;

  is_ele_ng: boolean = false;

  meterForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    meterNumber: new FormControl('', [Validators.required]),
    accountNumber: new FormControl(''),
    source: new FormControl('Electricity', [Validators.required]),
    phase: new FormControl('NA', [Validators.required]),
    fuel: new FormControl('', [Validators.required]),
    finalUnit: new FormControl('', [Validators.required]),
    startingUnit: new FormControl('', [Validators.required]),
    heatCapacity: new FormControl('1', [Validators.required]),
    siteToSource: new FormControl('1', [Validators.required]),
    group: new FormControl('', [Validators.required]),
    groupType: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    location: new FormControl(''),
    supplier: new FormControl(''),
    notes: new FormControl('')
  });

  @ViewChild('inputFile') myInputVariable: ElementRef;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    private utilityService: UtilityService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    private energyConsumptionService: EnergyConsumptionService,
    private convertUnitsService: ConvertUnitsService
  ) { }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;

      // get current facility object
      this.facilitydbService.getById(this.facilityid).then(
        data => {
          this.activeFacility = data;
        },
        error => {
          console.log(error);
        }
      );
    });

    // Observe the meter list
    this.utilityService.getMeterList().subscribe((value) => {
      this.meterList = value;
      console.log(value);
      this.meterMapTabs();
    });

    // Observe the energy final unit
    this.utilityService.getEnergyFinalUnit().subscribe((value) => {
      this.energyFinalUnit = value;
    });
  }

  // Close menus when user clicks outside the dropdown
  documentClick() {
    this.meterMenuOpen = null;
  }

  meterToggleMenu(index) {
    if (this.meterMenuOpen === index) {
      this.meterMenuOpen = null;
    } else {
      this.meterMenuOpen = index;
    }
  }

  meterAdd() {
    let utilityMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(this.facilityid, this.accountid);
    this.utilityMeterdbService.add(utilityMeter).then(
      id => {
        // unable to use subscription() in this scenario due to async issues
        this.utilityMeterdbService.getAllByIndexRange('facilityId', this.facilityid).then(
          data => {
            this.meterList = data; // refresh the data 

            this.toggleCancel = true; // requires the user to save the data of their new meter
            this.meterEdit(id); // edit data
            this.meterMapTabs(); // Remap tabs
          }
        );
      },
      error => {
        console.log(error);
      }
    );
  }


  async groupCheckExistence(groupType, groupName) {
    let groupid = 1;
    let group = null;
    // Save this meter in a default "unsorted" group.
    // This group can be renamed or deleted by user.
    // If they do this, another "unsorted" group will be created

    group = await this.utilityMeterGroupdbService.getByIndex('name', groupName); // check if group exists

    // If not add it
    if (group == null) {
      let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup(groupType, this.energyFinalUnit, groupName, this.facilityid, this.accountid);
      groupid = await this.utilityMeterGroupdbService.add(utilityMeterGroup); // add service returns id
    } else {
      groupid = group.id; // get current id
    }

    return groupid;
  }

  meterMapTabs() {
    // Remap tabs
    this.energySources = this.meterList.map(function (el) { return el.source; });
    this.energyConsumptionService.setEnergySource(this.energySources);
  }

  async meterSave() {
    this.window = !this.window;

    // If group is not defined, get "Unsorted" group's id/
    // The Unsorted group can be altered/deleted by the user so the id can change.
    if (this.meterForm.value.group == '') {
      this.meterForm.value.group = await this.groupCheckExistence("Energy", "Unsorted");
    }
    this.meterForm.controls['groupType'].setValue("Energy");
    this.meterForm.controls['finalUnit'].setValue(this.energyFinalUnit);

    this.utilityMeterdbService.update(this.meterForm.value); // Update db
    this.utilityService.setMeterList(); // refresh the data
    this.toggleCancel = false; // re-enable "edit meter" cancel button
  }



  meterEdit(id) {
    this.window = !this.window;
    this.meterMenuOpen = null;

    const thisMeter = this.meterList.find(obj => obj.id == id);
    this.meterForm.patchValue(thisMeter); // Set form values to current selected meter
  }

  meterDelete(id) {
    this.meterMenuOpen = null;
    // Alert the user

    // Delete all meter data for this meter
    this.utilityMeterDatadbService.getAllByIndexRange('meterId', id).then(
      data => {
        // delete
        for (let i = 0; i < data.length; i++) {
          this.utilityMeterDatadbService.deleteIndex(data[i]["id"]).then(
            data => {
              console.log("deleted");
            },
            error => {
              console.log(error);
            }
          );
        }

      },
      error => {
        console.log(error);
      }
    );
    // Delete meter
    this.utilityMeterdbService.deleteIndex(id);
    this.utilityService.setMeterList(); // refresh the data
  }

  meterImport(files: FileList) {
    // Clear with each upload
    this.quickView = [];
    this.import = [];
    this.importError = '';

    if (files && files.length > 0) {
      let file: File = files.item(0);
      //console.log(file.name);

      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].replace('\r', '').split(",");
        const allowedHeaders = ["meterNumber", "accountNumber", "type", "name", "location", "supplier", "group", "notes"];

        if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

          for (var i = 1; i < lines.length; i++) {
            const obj = {};
            const currentline = lines[i].split(",");
            for (var j = 0; j < headers.length; j++) {
              obj[headers[j]] = currentline[j];
            }

            // Read csv and push to obj array.
            this.import.push(obj);

            // Push the first 3 results to a quick view array
            if (i < 4) {
              this.quickView.push(obj);
            }

          }
        } else {
          // csv didn't match -> Show error
          this.importError = "Error with file. Please match your file to the provided template.";
          return false;
        }
      }
    }
  }

  async meterAddCSV() {
    this.importWindow = false;
    let counter = 1;

    for (let i = 0; i < this.import.length; i++) {
      let obj = this.import[i];

      let tempGroupid = await this.groupCheckExistence("Energy", obj.group);  // check if group exists, if not create it
      let newUtilityMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(this.facilityid, this.accountid);
      this.utilityMeterdbService.add(newUtilityMeter).then(
        id => {
          counter++;

          const importLine = {
            id: id,
            facilityid: this.facilityid,
            accountid: this.accountid,
            meterNumber: obj.meterNumber,
            accountNumber: obj.accountNumber,
            source: obj.source,
            phase: '',
            fuel: '',
            finalUnit: '',
            startingUnit: '',
            heatCapacity: '',
            siteToSource: '',
            location: obj.location,
            group: +tempGroupid,
            groupType: '',
            name: obj.name,
            supplier: obj.supplier,
            notes: obj.notes
          }
          //TODO: MARK COMMENTED OUT ISSUE-55
          // this.utilityMeterdbService.update(importLine); // Update db

          if (counter === this.import.length) {
            this.utilityService.setMeterList(); // refresh the data
          }

        },
        error => {
          console.log(error);
        }
      );
    }
    this.resetImport();
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
    this.quickView = [];
    this.import = [];
    this.importError = '';
  }

  meterExport() {
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(this.meterList[0]);
    let csv = this.meterList.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    //Download the file as CSV
    var downloadLink = document.createElement("a");
    var blob = new Blob(["\ufeff", csv]);
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "VerifiMeterDump.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage * (pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }

  onTypeChange(value) {
    console.log(value);
    if (value == 'Electricity' || value == 'Natural Gas') {
      this.is_ele_ng = true;
    } else {
      this.is_ele_ng = false;
    }
  }

}