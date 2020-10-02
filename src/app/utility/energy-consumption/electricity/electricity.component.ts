import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { AccountService } from "../../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";
import { UtilityService } from "../../../utility/utility.service";
import { ElectricitydbService } from "../../../indexedDB/electricity-db-service";
import { listAnimation } from '../../../animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { LoadingService } from "../../../shared/loading/loading.service";

@Component({
  selector: 'app-electricity',
  templateUrl: './electricity.component.html',
  styleUrls: ['./electricity.component.css'],
  animations: [
    listAnimation
  ]
})


export class ElectricityComponent implements OnInit {
  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;
  
  is_checked: boolean = false;
  is_checkedList: any = [];
  isMasterSel:boolean;

  accountid: number;
  facilityid: number;
  meterid: number = 1;

  meterList: any = [];
  meterDataList: any;
  meterDataMenuOpen: number;

  importPopup: boolean = false;
  importError: string = '';
  quickView: any = [];
  import: any = [];

  filterColMenu: boolean = false;
  filterCol = [
    {id: 0, filter: true, name: 'filterColBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterColSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterColSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterColFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterColFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterColPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterColPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterColOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterColOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterColDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterColDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterColGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterColDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterColTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterColPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterColBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterColUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterColLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterColOtherCharge', display: 'Other Charge'}
  ];

  filterInpMenu: boolean = false;
  filterInp = [
    {id: 0, filter: true, name: 'filterInpBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterInpSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterInpSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterInpFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterInpFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterInpPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterInpPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterInpOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterInpOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterInpDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterInpDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterInpGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterInpDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterInpTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterInpPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterInpBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterInpUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterInpLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterInpOtherCharge', display: 'Other Charge'}
  ];

  popup: boolean = false;

  meterDataForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //dataid: new FormControl('', [Validators.required]),
    meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    readDate: new FormControl('', [Validators.required]),
    totalKwh: new FormControl('', [Validators.required]),
    totalDemand: new FormControl('', [Validators.required]),
    totalCost: new FormControl('', [Validators.required]),
    basicCharge: new FormControl('', [Validators.required]),
    supplyBlockAmt: new FormControl('', [Validators.required]),
    supplyBlockCharge: new FormControl('', [Validators.required]),
    flatRateAmt: new FormControl('', [Validators.required]),
    flatRateCharge: new FormControl('', [Validators.required]),
    peakAmt: new FormControl('', [Validators.required]),
    peakCharge: new FormControl('', [Validators.required]),
    offpeakAmt: new FormControl('', [Validators.required]),
    offpeakCharge: new FormControl('', [Validators.required]),
    demandBlockAmt: new FormControl('', [Validators.required]),
    demandBlockCharge: new FormControl('', [Validators.required]),
    genTransCharge: new FormControl('', [Validators.required]),
    deliveryCharge: new FormControl('', [Validators.required]),
    transCharge: new FormControl('', [Validators.required]),
    powerFactorCharge: new FormControl('', [Validators.required]),
    businessCharge: new FormControl('', [Validators.required]),
    utilityTax: new FormControl('', [Validators.required]),
    latePayment: new FormControl('', [Validators.required]),
    otherCharge: new FormControl('', [Validators.required]),
    checked: new FormControl(false)
  });

  @ViewChild('inputFile') myInputVariable: ElementRef;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private utilityService: UtilityService,
    private loadingService: LoadingService,
    public utilityMeterdbService: UtilityMeterdbService,
    public electricitydbService: ElectricitydbService
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
    this.utilityService.getMeterData().subscribe((value) => {
      this.meterList = value;
      this.meterList = this.meterList.filter(function(obj) {
        return obj.type == "Electricity"
      });
    });    
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
    this.electricitydbService.add(id,this.facilityid,this.accountid).then(
      dataid => {
        // filter meter data based on meterid
        this.electricitydbService.getAllByIndex(id).then(
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
    // This forces all checkboxes to be reset to false on save.
    // Otherwise you get weird behavior with saving.
    this.meterDataForm.controls['checked'].setValue(false); 

    this.electricitydbService.update(this.meterDataForm.value);// Update db
    this.utilityService.refreshMeters(); // refresh calendarization
    this.utilityService.refreshMeterData(); // refresh the data for this page
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
    this.electricitydbService.deleteIndex(dataid);
    this.utilityService.setMeterData(this.meterList); // refresh the data
  }

  checkCheckboxes(e) {
    // Add/Remove meter id's from is_checkedList array.
    if(e.target.checked) {
      this.is_checkedList.push(e.target.value);
    } else {
      const index = this.is_checkedList.indexOf(e.target.value);
      this.is_checkedList.splice(index, 1);
    }

    this.showBulkDelete();
  }

  checkAll(meterid, e) {
    // Get all bill id's with the meter value of e

    var index = this.meterList.map(function(el) { return el.id; }).indexOf(meterid);

    // Add/Remove meter id's from is_checkedList array.
    if(e.target.checked) {
      // get all meter data ids
      for(let i=0; i<this.meterList[index]['data'].length; i++) {
        this.is_checkedList.push(this.meterList[index]['data'][i]['id']); // Adds to queue array
        this.meterList[index]['data'][i]['checked'] = true; // Shows user which are checked
      }
    } else {
      for(let i=0; i<this.meterList[index]['data'].length; i++) {
        const meterindex = this.is_checkedList.indexOf(meterid);
        this.is_checkedList.splice(meterindex,1); // Adds to queue array
        this.meterList[index]['data'][i]['checked'] = false; // Shows user which are unchecked
      }
      
    }
    this.showBulkDelete();
  }

  showBulkDelete() {
    // Show "Bulk Delete" button if any items are checked
    if(this.is_checkedList.length != 0) {
      this.is_checked = true;
    } else {
      this.is_checked = false;
    }
  }

  bulkDelete() {
    let counter = 1; // keeps track of the end of the loop (async)
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Records...");
    this.meterDataMenuOpen = null;

    // Uncheck master inputs after delete
    this.masterCheckbox.forEach((element) => {
      element.nativeElement.checked = false;
    });

    for(let i=0; i < this.is_checkedList.length; i++) {
      this.electricitydbService.deleteIndex(+this.is_checkedList[i]).then(
        id => {
          counter++;

          if(counter === this.is_checkedList.length) {
            this.loadingService.setLoadingStatus(false);
            this.utilityService.setMeterData(this.meterList); // refresh the data
            this.is_checked = false;
          }
          
        },
        error => {
            console.log(error);
        }
      );;
    }
    
  }

  showAllFields() {
    for(let i=0; i < this.filterInp.length; i++) {
      this.filterInp[i]["filter"] = true;
    }
  }

  showAllColumns() {
    for(let i=0; i < this.filterCol.length; i++) {
      this.filterCol[i]["filter"] = true;
    }
  }

  meterDataImport (files: FileList) {
    // Clear with each upload
    this.quickView = []; 
    this.importError = '';

    if(files && files.length > 0) {
       let file : File = files.item(0); 
         
         let reader: FileReader = new FileReader();
         reader.readAsText(file);
         reader.onload = (e) => {
            let csv: string = reader.result as string;
            const lines = csv.split("\n");
            const headers = lines[0].replace('\r', '').split(",");
            const allowedHeaders = ["meterNumber","readDate","totalKwh","totalDemand","totalCost","basicCharge","supplyBlockAmt","supplyBlockCharge","flatRateAmt","flatRateCharge","peakAmt","peakCharge","offpeakAmt","offpeakCharge","demandBlockAmt","demandBlockCharge","genTransCharge","deliveryCharge","transCharge","powerFactorCharge","businessCharge","utilityTax","latePayment","otherCharge"];

            if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

              for(var i=1;i<lines.length;i++){
                const obj = {};
                const currentline=lines[i].split(",");
                for(var j=0;j<headers.length;j++){
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

  meterAddCSV() {
    let counter = 1; // keeps track of the end of the loop (async)
    let meterids = [];
    const length = this.import.length;

    this.importPopup = false;
    this.loadingService.setLoadingStatus(true);
    
    for(let i=0;i<this.import.length;i++){
      let obj = this.import[i];
      
      meterids.push(this.meterList.find(x => x.meterNumber == obj.meterNumber)['id']); // Get id of matching meter numbers
      console.log(meterids);

      this.electricitydbService.add(this.meterid,this.facilityid,this.accountid).then(
        id => {
          counter++;
          this.loadingService.setLoadingMessage(counter + " of " + length + " Records Imported...");

          const importLine = {
            id: id,
            meterid: meterids[i],
            facilityid: this.facilityid,
            accountid: this.accountid,
            readDate: obj.readDate,
            totalKwh: obj.totalKwh,
            totalDemand: obj.totalDemand,
            totalCost: obj.totalCost,
            basicCharge: obj.basicCharge,
            supplyBlockAmt: obj.supplyBlockAmt,
            supplyBlockCharge: obj.supplyBlockCharge,
            flatRateAmt: obj.flatRateAmt,
            flatRateCharge: obj.flatRateCharge,
            peakAmt: obj.peakAmt,
            peakCharge: obj.peakCharge,
            offpeakAmt: obj.offpeakAmt,
            offpeakCharge: obj.offpeakCharge,
            demandBlockAmt: obj.demandBlockAmt,
            demandBlockCharge: obj.demandBlockCharge,
            genTransCharge: obj.genTransCharge,
            deliveryCharge: obj.deliveryCharge,
            transCharge: obj.transCharge,
            powerFactorCharge: obj.powerFactorCharge,
            businessCharge: obj.businessCharge,
            utilityTax: obj.utilityTax,
            latePayment: obj.latePayment,
            otherCharge: obj.otherCharge
          }

          this.electricitydbService.update(importLine); // Update db
          
          // If end of the loop
          if (counter === length) {
            this.utilityService.setMeterData(this.meterList); // refresh the data
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
    
      for (let i=0; i < this.meterList.length; i++) {

        const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
        const header = Object.keys(this.meterList[i].data[0]);

        header.splice(0, 4); // remove 1st 4 headers
        header.splice(0, 1, "meterNumber"); // add meterNumber

        
        let csv = this.meterList[i].data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
        
        // add meterNumber as first cell
        for (let j=0; j < csv.length; j++) {
          csv[j] = '"' +this.meterList[i].meterNumber +  '"' + csv[j];
        }
  
        csv.unshift(header.join(','));
        csv = csv.join('\r\n');

        //Download the file as CSV
        var downloadLink = document.createElement("a");
        var blob = new Blob(["\ufeff", csv]);
        var url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = "VerifiMeterDataDump.csv";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

      }
      
  }

}
