import { Component, OnInit, ElementRef, ViewChild} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { EnergyConsumptionService } from '../energy-consumption.service';
import { AccountService } from "../../../account/account/account.service";
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db-service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";
import { UtilityMeterGroupdbService } from "../../../indexedDB/utilityMeterGroup-db.service";
import { listAnimation } from '../../../animations';

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

  meterMenuOpen: number;
  popup: boolean = false;

  energySource: any;
  selectedMeter: any;
  meterList: any = [{type: ''}];
  
  importPopup: boolean = false;
  importError: string = '';
  quickView: any = [];

  meterForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    meterNumber: new FormControl('', [Validators.required]),
    accountNumber: new FormControl('', [Validators.required]),
    type: new FormControl('', [Validators.required]),
    group: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    supplier: new FormControl('', [Validators.required]),
    notes: new FormControl('', [Validators.required])
  });
  
  @ViewChild('inputFile') myInputVariable: ElementRef;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
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

  // List all meters
  meterLoadList() {
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


  groupCheckExistence(name) {
    this.utilityMeterGroupdbService.getByName(name).then(
      data => {
        console.log("check groups");
        console.log(data);
        if (data == null) {
          console.log("add it");
          this.groupAdd(this.meterForm.value.group); // if not, create it
        }
      },
      error => {
          console.log(error);
      }
    );
  }
  groupAdd(name) {
    this.utilityMeterGroupdbService.add(name,this.facilityid,this.accountid).then(
      data => {
        console.log(data);
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
    // Save this meter in a default group based on its type. 
    // Prevent bad reporting by changing the group if the type is changed.
    // But only if the meter has not been moved from the default grouping.
    if (this.meterForm.value.group == '' || this.meterForm.value.group == 'Electricity' || this.meterForm.value.group == 'Natural Gas') {
      this.meterForm.value.group = this.meterForm.value.type;
    }
    this.groupCheckExistence(this.meterForm.value.group); // check if group exists

    this.utilityMeterdbService.update(this.meterForm.value); // Update db
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

  meterImport (files: FileList) {
    // Clear with each upload
    this.quickView = []; 
    this.importError = '';

    if(files && files.length > 0) {
       let file : File = files.item(0); 
         //console.log(file.name);
         
         let reader: FileReader = new FileReader();
         reader.readAsText(file);
         reader.onload = (e) => {
            let csv: string = reader.result as string;
            const lines = csv.split("\n");
            const headers = lines[0].replace('\r', '').split(",");
            const allowedHeaders = ["meterNumber", "accountNumber", "type", "name", "supplier", "notes"];

            if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

              for(var i=1;i<lines.length;i++){
                const obj = {};
                const currentline=lines[i].split(",");
                for(var j=0;j<headers.length;j++){
                  obj[headers[j]] = currentline[j];
                }
                this.quickView.push(obj); // Read csv and push to obj array.
              }  
            } else {
              // csv didn't match -> Show error
              this.importError = "Error with file. Please match your file to the provided template.";
              return false;
            }
         }
      }
  }

  meterAddCSV() {
    this.importPopup = false;
    
    for(let i=0;i<this.quickView.length;i++){
      let obj = this.quickView[i];

      this.utilityMeterdbService.add(this.facilityid,this.accountid).then(
        id => {
          const importLine = {
            id: id,
            facilityid: this.facilityid,
            accountid: this.accountid,
            meterNumber: obj.meterNumber,
            accountNumber: obj.accountNumber,
            type: obj.type,
            group: obj.type,
            name: obj.name,
            supplier: obj.supplier,
            notes: obj.notes
          }

          this.utilityMeterdbService.update(importLine); // Update db
          this.meterLoadList(); // refresh the data
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

}