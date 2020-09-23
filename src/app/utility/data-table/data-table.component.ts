import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../utility/utility.service";
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
  dataGroups: any = [];
  tempList: any = [];
  tempList2: any = [];
  allMeterData: any = [];
  calendarData: any = [];

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
    data: new FormControl([], [Validators.required]),
    dateModified: new FormControl('', [Validators.required]),
    fracTotEnergy: new FormControl('', [Validators.required])
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private utilityService: UtilityService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    ) { }

    public chart = {
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
        ]
    };

    public chartLayout = {
      layout: {height: 140, margin: {l: 10,r: 10,b: 20,t: 20, pad: 20}},
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
    });

    // Observe the meter list
    this.utilityService.getMeters().subscribe((value) => {
      this.meterList = value;
      this.tempList = value;
      this.tempList2 = value;

      this.groupLoadList(); // List all groups
    });

    // Observe the meter list
    this.utilityService.getCalendarData().subscribe((value) => {
      this.calendarData = value;
    });


  }


  groupLoadList() {
    // List the meter groups
    this.utilityMeterGroupdbService.getAllByIndex(this.facilityid).then(
      data => {
        this.meterGroups = data;
        this.groupLoadMeters(); // load meters into groups
        this.groupGetAvg();
        this.groupTestLabels();
        //console.log(this.meterGroups);
      },
      error => {
          console.log(error);
      }
    );
  }

  groupLoadMeters() {
    let result = this.tempList2.reduce((result, item) => {
      const group = (result[item.group] || []);
      group.push(item);
      result[item.group] = group;
      const index = this.meterGroups.map(e => e.name).indexOf(item.group);
      this.meterGroups[index]['data'] = group;
      return result;
    }, {});
    console.log("here");
    console.log(this.meterList);
    console.log(this.meterGroups);
  }

  // Adding the dropdown list of types
  groupTestLabels() {
    let result = this.tempList.reduce((result, item) => {
      const type = (result[item.type] || []);
      type.push(0);
      result[item.type] = type;

      const index = this.meterGroups.map(e => e.name).indexOf(item.group);
      this.meterGroups[index]['types'] = Object.keys(result) +" "+ type.length;
      return result;
    }, {});
    console.log(result);
  }

  groupGetAvg() {
    let groupTotal = 0;
    let fraction = 0;
    let result = 0;
    let allMeterTotal = 0;

    console.log("Avg");
    console.log(this.meterList[0]);


    // Add up the total kwh for every meter
    for(let i=0; i<this.calendarData.length; i++) {
      allMeterTotal = +allMeterTotal + +this.calendarData[i]['monthKwh'];
    }

    // Add up the month kwh for all meters inside the group
    for(let i=0; i<this.meterGroups.length; i++) {

      for(let j=0; j<this.meterList.length; j++) {
        if (this.meterGroups[i]["name"] == this.meterList[j]["type"]) {

            for(let k=0; k<this.meterList[j]['calendarization'].length; k++) {
              //console.log(this.meterList[j]['calendarization'][k]['monthKwh']);
              groupTotal = +groupTotal + +this.meterList[j]['calendarization'][k]['monthKwh'];

            }
            //console.log(this.meterList[j]["calendarization"]);
        }
      }

      // Do some math to get percent
      // Set the object value for each meter group.
      this.meterGroups[i].fracTotEnergy = ((groupTotal/allMeterTotal)*100).toFixed();

      // reset total for next group
      groupTotal = 0;
    }
  }

  groupToggleMenu (index) {
    if (this.groupMenuOpen === index) {
      this.groupMenuOpen = null;
    } else {
      this.groupMenuOpen = index;
    }
  }

  groupAdd(type, name) {
    this.utilityMeterGroupdbService.add(type,name,this.facilityid,this.accountid).then(
      data => {
        this.meterGroups.push({'name': 'New Group '  + (+this.meterGroups.length + +1),'desc': 'You may edit this group to fit your needs.', data: []}); // Shows the next group before its actually populated... better or worse?
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
