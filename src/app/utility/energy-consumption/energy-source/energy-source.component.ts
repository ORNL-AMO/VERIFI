import { Component, OnInit, ElementRef, ViewChild} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { EnergyConsumptionService } from '../energy-consumption.service';
import { AccountService } from "../../../account/account/account.service";
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db-service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../../utility/utility.service";
import { ElectricitydbService } from "../../../indexedDB/electricity-db-service";
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
  window: boolean = false;
  popup: boolean = false;
  id: number;

  energySource: any;
  selectedMeter: any;
  meterList: any = [{type: ''}];
  
  importWindow: boolean = false;
  importError: string = '';
  quickView: any = [];
  toggleCancel: boolean = false; // Used to prevent "Cancel" when Adding New Meter (Cancel leaves the meter blank)

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
    private utilityService: UtilityService,
    public electricitydbService: ElectricitydbService,
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
            //this.meterLoadList();
          },
          error => {
              console.log(error);
          }
        );
    });

    // Observe the meter list
    this.utilityService.getMeters().subscribe((value) => {
      this.meterList = value;
      this.meterMapTabs();
      console.log(this.meterList);
    });
  }

  // Close menus when user clicks outside the dropdown
  documentClick () {
    this.meterMenuOpen = null;
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
        // unable to use subscription() in this scenario due to async issues
        this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
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


  groupCheckExistence(name) {
    this.utilityMeterGroupdbService.getByName(name).then(
      data => {
        // if doesn't, create it
        if (data == null) {
          this.groupAdd('Energy',this.meterForm.value.group); 
        }
      },
      error => {
          console.log(error);
      }
    );
  }

  groupAdd(type,name) {
    this.utilityMeterGroupdbService.add(type,name,this.facilityid,this.accountid);
  }

  meterMapTabs() {
    // Remap tabs
    this.energySource = this.meterList.map(function (el) { return el.type; });
    this.energyConsumptionService.setValue(this.energySource);
  }

  meterSave() {
    this.window = !this.window;
    // Save this meter in a default group based on its type. 
    // Prevent bad reporting by changing the group if the type is changed.
    // But only if the meter has not been moved from the default grouping.
    if (this.meterForm.value.group == '' || this.meterForm.value.group == 'Electricity' || this.meterForm.value.group == 'Natural Gas') {
      this.meterForm.value.group = this.meterForm.value.type;
    }
    this.groupCheckExistence(this.meterForm.value.group); // check if group exists

    this.utilityMeterdbService.update(this.meterForm.value); // Update db
    this.utilityService.refreshMeters(); // refresh the data
    this.toggleCancel = false; // re-enable "edit meter" cancel button
  }

  meterEdit(id) {
    this.window = !this.window;
    this.meterMenuOpen = null;
    this.meterForm.setValue(this.meterList.find(obj => obj.id == id)); // Set form values to current selected meter
  }

  meterDelete(id) {
    this.meterMenuOpen = null;
    // Alert the user

    // Delete all meter data for this meter
    this.electricitydbService.getAllByIndex(id).then(
      data => {
        // delete
        for(let i=0; i<data.length; i++) {
          this.electricitydbService.deleteIndex(data[i]["id"]).then(
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
    this.utilityService.refreshMeters(); // refresh the data
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

              for(var i=1;i<4;i++){
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
    this.importWindow = false;
    
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
          this.utilityService.refreshMeters();
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