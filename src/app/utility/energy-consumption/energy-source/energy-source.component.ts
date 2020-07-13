import { Component, OnInit} from '@angular/core';
import { FormGroup, FormControl, Validators, ControlContainer, FormGroupDirective } from '@angular/forms';
import { EnergyConsumptionService } from '../energy-consumption.service';
import { AccountService } from "../../../account/account/account.service";
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db-service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";
import {listAnimation} from '../../../animations';

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
  activeFacility: any = {name: ''};
  energySource: any;
  meterMenuOpen: number;
  popup: boolean = false;
  selectedMeter: any;
  meterList: any = [{type: ''}];

  meterForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    meterNumber: new FormControl('', [Validators.required]),
    accountNumber: new FormControl('', [Validators.required]),
    type: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    supplier: new FormControl('', [Validators.required]),
    notes: new FormControl('', [Validators.required])
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    private energyConsumptionService: EnergyConsumptionService
    ) {}

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
            this.meterLoadList();
          },
          error => {
              console.log(error);
          }
        );
    });
  }

  // Close menus when user clicks outside the dropdown
  documentClick () {
    this.meterMenuOpen = null;
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
        this.meterList = data;
        this.meterMapTabs();
      },
      error => {
          console.log(error);
      }
    );
  }

  meterToggleMenu (index) {
    if (this.meterMenuOpen === index) {
      this.meterMenuOpen = null;
    } else {
      this.meterMenuOpen = index;
    }
  }

  meterAdd() {
    this.utilityMeterdbService.add(this.facilityid,this.accountid).then(
      id => {
        // unable to call meterLoadList() in this scenario due to async properties
        this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
          data => {
              this.meterList = data; // refresh the data 
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

  meterMapTabs() {
    // Remap tabs
    this.energySource = this.meterList.map(function (el) { return el.type; });
    this.energyConsumptionService.setValue(this.energySource);

  }
  meterSave() {
    this.popup = !this.popup;
    this.utilityMeterdbService.update(this.meterForm.value);// Update db
    this.meterLoadList(); // refresh the data
  }

  meterEdit(id) {
    this.popup = !this.popup;
    this.meterMenuOpen = null;
    this.meterForm.setValue(this.meterList.find(obj => obj.id == id)); // Set form values to current selected meter
  }

  meterDelete(id) {
    this.meterMenuOpen = null;
    this.utilityMeterdbService.deleteIndex(id);
    this.meterLoadList(); // refresh the data
  }

  public changeListener(files: FileList){
    console.log(files);
    if(files && files.length > 0) {
       let file : File = files.item(0); 
         console.log(file.name);
         console.log(file.size);
         console.log(file.type);
         let reader: FileReader = new FileReader();
         reader.readAsText(file);
         reader.onload = (e) => {
            let csv: string = reader.result as string;
            console.log(csv);
         }
      }
  }
  
}