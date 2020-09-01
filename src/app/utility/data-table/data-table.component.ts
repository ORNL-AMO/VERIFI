import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { ElectricitydbService } from "../../indexedDB/electricity-db-service";
import { NaturalGasdbService } from "../../indexedDB/naturalGas-db-service";
import { UtilityService } from "../utility.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterList: any = [];
  meterGroups: any = [];
  meterDataList: any;
  dataTable: any = [];
  unit: string;

  date = new Date();
  today = this.date.toDateString()

  groupMenuOpen: boolean = false;
  tooltip: boolean = false;
  popup: boolean = false;

  groupForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    groupid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    desc: new FormControl('', [Validators.required]),
    unit: new FormControl('', [Validators.required]),
    dateModified: new FormControl('', [Validators.required]),
    fracTotEnergy: new FormControl('', [Validators.required])
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
    public electricitydbService: ElectricitydbService,
    public naturalGasdbService: NaturalGasdbService,
    public utilityService: UtilityService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    ) { }

    public graph3 = {
      data: [
        {
          domain: { x: [0, 1], y: [0, 1] },
          value: 0,
          type: "indicator",
          mode: "gauge+number",
          gauge: {
            axis: { range: [null, 500] },
            bar: { color: "#2980b9" },
            bgcolor: "#eee",
            borderwidth: 0,
            steps: [
              { range: [0, 0], color: "#2980b9" }
            ]
          }
        }
        ],
      layout: {height: 150, margin: {l: 10,r: 10,b: 20,t: 20, pad: 20}},
      config: {responsive: true},
    };

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
      this.meterLoadList();
      //this.meterDataLoadList();
    });

    this.groupLoadList(); // List all groups
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
          this.meterList = data;
          /*this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Electricity"
          });*/
          // Add all meter data to meter list
          this.meterDataLoadList()
      },
      error => {
          console.log(error);
      }
    );
  }

  meterDataLoadList() {
  // loop each meter
    for (let i=0; i < this.meterList.length; i++) {
      //console.log(this.meterList);
      if (this.meterList[i].type == 'Electricity') {
        // filter meter data based on meterid
        this.electricitydbService.getAllByIndex(this.meterList[i]['id']).then(
          data => {
            // push to meterlist object
            this.utilityService.setValue(this.meterList);
          },
          error => {
              console.log(error);
          }
        );
        this.unit = 'kWh';
      }
      if (this.meterList[i].type == 'Natural Gas') {
        this.naturalGasdbService.getAllByIndex(this.meterList[i]['id']).then(
          data => {
            // push to meterlist object
            this.utilityService.setValue(this.meterList);
          },
          error => {
              console.log(error);
          }
        );
        this.unit = '(cfm)/MMBTU';
      }
    }
  }

  groupLoadList() {
    // List the meter groups
    this.utilityMeterGroupdbService.getAllByIndex(this.facilityid).then(
      data => {
        this.meterGroups = data;
        console.log(this.meterGroups);
      },
      error => {
          console.log(error);
      }
    );
  }
  groupToggleMenu (index) {
    if (this.groupMenuOpen === index) {
      this.groupMenuOpen = null;
    } else {
      this.groupMenuOpen = index;
    }
  }

  groupAdd(name) {
    this.utilityMeterGroupdbService.add(name,this.facilityid,this.accountid).then(
      data => {
        this.meterGroups.push({'name': 'New Group '  + (+this.meterGroups.length + +1),'desc': 'You may edit this group to fit your needs.'}); // Shows the next group before its actually populated... better or worse?
        this.groupLoadList(); // Refresh list of groups
      },
      error => {
          console.log(error);
      }
    );
  }

  groupEdit(id) {
    this.popup = !this.popup;
    this.groupMenuOpen = null;
    this.groupForm.setValue(this.meterGroups.find(obj => obj.id == id)); // Set form values to current selected meter
    this.groupForm.controls.dateModified.setValue(this.today);
  }

  groupDelete(id) {
    console.log("delete");
    this.groupMenuOpen = null;
    // First check if all meters have been removed from the group
    // If no, alert the user.
    // If yes, delete group
    // Refresh group list

    this.utilityMeterGroupdbService.deleteIndex(id);

    // Refresh list of groups
    // I splice the array vs refreshing the list because its faster for the user.
    const index = this.meterGroups.map(e => e.id).indexOf(id);
    this.meterGroups.splice(index, 1); // remove it

  }

  groupSave() {
    this.popup = !this.popup;
    this.groupMenuOpen = null;
    this.utilityMeterGroupdbService.update(this.groupForm.value); // Update db
    this.groupLoadList(); // Refresh list of groups
  }
}
