import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../utility/utility.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

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
  calendarDataTemp: any = [];
  connectedTo: any = [];

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
    groupType: new FormControl('', [Validators.required]),
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
    private utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    ) { }

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
     // this.groupLoadList(); // List all groups
    });

    // Observe the meter list
    this.utilityService.getCalendarData().subscribe((value) => {
      this.calendarData = value;
      this.calendarDataTemp = value;
      //console.log("Calendar");
      //console.log(value);
      this.groupLoadList(); // List all groups
    });

  }


  groupLoadList() {
    // List the meter groups
    this.utilityMeterGroupdbService.getAllByIndex(this.facilityid).then(
      data => {
        this.meterGroups = data;
        this.groupLoadMeters(); // load meters into groups
        this.groupGetAvg();
        //this.groupTestLabels();

        this.connectedTo=[];
        for (let index of this.meterGroups) {
          this.connectedTo.push('energy'+String(index.id));
        }
        //console.log("Meter Groups");
        //console.log(this.meterGroups);
      },
      error => {
          console.log(error);
      }
    );
    
  }

  groupLoadMeters() {
    // Reset data
    for (let i=0; i<this.meterGroups.length; i++) {
      this.meterGroups[i]['data']=[];
    }

    // Store new results
    let result = this.tempList2.reduce((result, item) => {
      const group = (result[item.group] || []);
      group.push(item);
      result[item.group] = group;
      const index = this.meterGroups.map(e => e.id).indexOf(+item.group);
      this.meterGroups[index]['data'] = group;
      return result;
    }, {});
    //console.log("Meter List");
    //console.log(this.meterList);
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
    //console.log(result);
  }

   
   meterCalendarTotals() {
    //console.log(this.calendarDataTemp);
    //console.log(this.calendarData.length);
    // Quickly calculate calendar totals for each meter
    let result = this.calendarDataTemp.reduce((result, item) => {
      const meterid = [];
      
      meterid.push(item.monthKwh);

      result[item.meterid] = (result[item.meterid] || 0) + +meterid;
      
      return result;
    }, {});
    return result;
  }

  groupGetAvg() {
    let groupTotal = 0;
    let allMeterTotal = 0;

    let meterCalTot = this.meterCalendarTotals(); // Object containing totals for each meter

    // Add up the total kwh for every month available
    if (this.calendarData != null) {
      for(let i=0; i<this.calendarData.length; i++) {
        
        if(this.calendarData[i]['monthKwh'] != 'NA') {
          allMeterTotal = +allMeterTotal + +this.calendarData[i]['monthKwh'];
        }
  
      }
    }

    // Add up the month kwh for all meters inside the group
    for(let i=0; i<this.meterGroups.length; i++) {

      for(let j=0; j<this.meterList.length; j++) {
        
        if (this.meterGroups[i]["id"] == this.meterList[j]["group"]) {
          groupTotal = groupTotal + meterCalTot[this.meterList[j]['id']]; // meterCalendarTotals() object from earlier
        }
      }

      // Set the object value for each meter group.
      this.meterGroups[i].fracTotEnergy = ((groupTotal/allMeterTotal)*100).toFixed();
      //console.log("groupTotal "+groupTotal);
      //console.log("allMeterTotal "+allMeterTotal);
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
        //this.meterGroups.push({'name': 'New Group '  + (+this.meterGroups.length + +1), data: []}); // Shows the next group before its actually populated... better or worse?
        this.groupLoadList(); // Refresh list of groups
      },
      error => {
          console.log(error);
      }
    );
  }

  groupEdit(id) {
    console.log(id);
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

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) { // if same list
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, // if different list
        event.container.data,
        event.previousIndex,
        event.currentIndex);

        // After list has updated, get its info
        const currentIndex = event.currentIndex;

        // Get this meter's value
        let meterValues = event.container.data[currentIndex];
    
        // Set this meter's id
        const meterId = meterValues['id'];
        
        // Get new container group id
        const newGroupId = (event.container.id).replace('energy', '');

        // Set New Group Value
        meterValues['group'] = +newGroupId; // make sure its an int

        // Remove 'data' and 'calendarization' before importing. These values do not exist in the database.
        delete meterValues['calendarization']; 

        // Update meter with its new group id
        this.utilityMeterdbService.update(meterValues).then(
          data => {
            // recalculate average when done.
            this.groupGetAvg();
          },
          error => {
              console.log(error);
          }
        );

        
    }
  }
}
