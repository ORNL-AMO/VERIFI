import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";
import { NaturalGasdbService } from "../../../indexedDB/naturalGas-db-service";
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-natural-gas',
  templateUrl: './natural-gas.component.html',
  styleUrls: ['./natural-gas.component.css']
})
export class NaturalGasComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterid: number = 1;
  meterList: any = [];
  meterDataList: any;
  meterDataMenuOpen: number;

  popup: boolean = false;

  meterDataForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //dataid: new FormControl('', [Validators.required]),
    meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    readDate: new FormControl('', [Validators.required]),
    totalVolume: new FormControl('', [Validators.required]),
    commodityCharge: new FormControl('', [Validators.required]),
    deliveryCharge: new FormControl('', [Validators.required]),
    otherCharge: new FormControl('', [Validators.required]),
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
    public naturalGasdbService: NaturalGasdbService
    ) { }

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
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
          this.meterList = data;
          this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Natural Gas"
          });
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
      // filter meter data based on meterid
      this.naturalGasdbService.getAllByIndex(this.meterList[i]['id']).then(
        data => {
          // push to meterlist object
          this.meterList[i]['data'] = data;
        },
        error => {
            console.log(error);
        }
      );
    }
  }

  // Close menus when user clicks outside the dropdown
  documentClick () {
    this.meterDataMenuOpen = null;
  }

  meterDataToggleMenu (index) {
    if (this.meterDataMenuOpen === index) {
      this.meterDataMenuOpen = null;
    } else {
      this.meterDataMenuOpen = index;
    }
  }

  meterDataAdd(id) {
    console.log("meter id " +id);
    this.naturalGasdbService.add(id,this.facilityid,this.accountid).then(
      dataid => {
        // filter meter data based on meterid
        this.naturalGasdbService.getAllByIndex(id).then(
          result => {
            // push to meterlist object
            const index = this.meterList.findIndex(obj => obj.id == id);
            this.meterList[index]['data'] = result;
            this.meterDataEdit(id,dataid); // edit data
          },
          error => {
              console.log(error);
          }
        );
      },
      error => {
          console.log(error);
      }
    );
  }

  meterDataSave() {
    this.popup = !this.popup;
    console.log(this.meterDataForm.value);
    this.naturalGasdbService.update(this.meterDataForm.value);// Update db
    this.meterDataLoadList(); // refresh the data
  }

  meterDataEdit(meterid,dataid) {
    this.popup = !this.popup;
    this.meterDataMenuOpen = null;
    const meter = this.meterList.find(obj => obj.id == meterid);
    const meterdata = meter.data.find(obj => obj.id == dataid);
    this.meterDataForm.setValue(meterdata); // Set form values to current selected meter
  }

  meterDataDelete(dataid) {
    this.meterDataMenuOpen = null;
    this.naturalGasdbService.deleteIndex(dataid);
    this.meterDataLoadList(); // refresh the data
  }
}

