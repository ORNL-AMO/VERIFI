import { ElementRef, QueryList, ViewChildren, Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable, BehaviorSubject } from 'rxjs';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../utility/utility.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db-service";
import { LoadingService } from "../../shared/loading/loading.service";

@Injectable({
  providedIn: 'root'
})
export class EnergyConsumptionService {
  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;

  public energySource = new BehaviorSubject(null);
  is_checked: boolean = false;
  is_checkedList: any = [];
  isMasterSel:boolean;

  accountid: number;
  facilityid: number;
  meterid: number = 1;

  meterList: any = [];
  meterDataList: any;
  meterDataMenuOpen: number;

  popup: boolean = false;
  importPopup: boolean = false;
  importError: string = '';
  quickView: any = [];
  import: any = [];

  meterDataForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //dataid: new FormControl('', [Validators.required]),
    meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    readDate: new FormControl('', [Validators.required]),
    totalKwh: new FormControl('', [Validators.required]),
    totalVolume: new FormControl('', [Validators.required]),
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
    commodityCharge: new FormControl('', [Validators.required]),
    utilityTax: new FormControl('', [Validators.required]),
    latePayment: new FormControl('', [Validators.required]),
    otherCharge: new FormControl('', [Validators.required]),
    checked: new FormControl(false)
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private utilityService: UtilityService,
    private loadingService: LoadingService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService
  ) { 
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
    });
  }

  getValue(): Observable<number> {
    // Keep users state
    return this.energySource.asObservable();
  }

  setValue(newValue): void {
    this.energySource.next(newValue);
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
    this.utilityMeterDatadbService.add(id,this.facilityid,this.accountid).then(
      dataid => {
        // filter meter data based on meterid
        this.utilityMeterDatadbService.getAllByIndex(id).then(
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

    this.utilityMeterDatadbService.update(this.meterDataForm.value);// Update db
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
    this.utilityMeterDatadbService.deleteIndex(dataid);
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
    
    /*
    // Uncheck master inputs after delete
    this.masterCheckbox.forEach((element) => {
      element.nativeElement.checked = false;
    });*/

    
    for(let i=0; i < this.is_checkedList.length; i++) {
      this.utilityMeterDatadbService.deleteIndex(+this.is_checkedList[i]).then(
        id => {
          
          if(counter === this.is_checkedList.length) {
            this.loadingService.setLoadingStatus(false);
            this.utilityService.setMeterData(this.meterList); // refresh the data
            this.is_checked = false;
          }
          counter++;
          
        },
        error => {
            console.log(error);
        }
      );;
    }
    
  }

  meterDataImport (type, files: FileList) {
    // Clear with each upload
    this.quickView = []; 
    this.importError = '';
    let allowedHeaders;

    if (type == 'Electricity') {
      allowedHeaders = ["meterNumber","readDate","totalKwh","totalDemand","totalCost","basicCharge","supplyBlockAmt","supplyBlockCharge","flatRateAmt","flatRateCharge","peakAmt","peakCharge","offpeakAmt","offpeakCharge","demandBlockAmt","demandBlockCharge","genTransCharge","deliveryCharge","transCharge","powerFactorCharge","businessCharge","utilityTax","latePayment","otherCharge"];
    } else {
      allowedHeaders = ["meterNumber","readDate","totalVolume","commodityCharge","deliveryCharge","otherCharge"];
    }

    if(files && files.length > 0) {
       let file : File = files.item(0); 
         
         let reader: FileReader = new FileReader();
         reader.readAsText(file);
         reader.onload = (e) => {
            let csv: string = reader.result as string;
            const lines = csv.split("\n");
            const headers = lines[0].replace('\r', '').split(",");
            

            // if contains.. not if in the same order
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

      this.utilityMeterDatadbService.add(meterids[i],this.facilityid,this.accountid).then(
        id => {
          this.loadingService.setLoadingMessage(counter + " of " + length + " Records Imported...");

          const importLine = {
            // All Fuels
            id: id,
            meterid: meterids[i],
            facilityid: this.facilityid,
            accountid: this.accountid,
            readDate: obj.readDate,

            // Natural Gas +
            totalVolume: obj.totalVolume || 0,
            commodityCharge: obj.commodityCharge || 0,
            deliveryCharge: obj.deliveryCharge || 0,
            otherCharge: obj.otherCharge || 0,

            // Electric only
            totalKwh: obj.totalKwh || 0,
            totalDemand: obj.totalDemand || 0,
            totalCost: obj.totalCost || 0,
            basicCharge: obj.basicCharge || 0,
            supplyBlockAmt: obj.supplyBlockAmt || 0,
            supplyBlockCharge: obj.supplyBlockCharge || 0,
            flatRateAmt: obj.flatRateAmt || 0,
            flatRateCharge: obj.flatRateCharge || 0,
            peakAmt: obj.peakAmt || 0,
            peakCharge: obj.peakCharge || 0,
            offpeakAmt: obj.offpeakAmt || 0,
            offpeakCharge: obj.offpeakCharge || 0,
            demandBlockAmt: obj.demandBlockAmt || 0,
            demandBlockCharge: obj.demandBlockCharge || 0,
            genTransCharge: obj.genTransCharge || 0,
            transCharge: obj.transCharge || 0,
            powerFactorCharge: obj.powerFactorCharge || 0,
            businessCharge: obj.businessCharge || 0,
            utilityTax: obj.utilityTax || 0,
            latePayment: obj.latePayment || 0,
            checked: false,
          }

          this.utilityMeterDatadbService.update(importLine); // Update db
          
          // If end of the loop
          if (counter === length) {
            this.utilityService.setMeterData(this.meterList); // refresh the data
          }

          counter++;

        },
        error => {
            console.log(error);
        }
      );
    }
    this.resetImport();
    
  }

  resetImport() {
   // this.myInputVariable.nativeElement.value = '';
    this.quickView = []; 
    this.import = [];
    this.importError = '';
  }

  meterExport(type) {
    let csv;

    // Filter based on type
    const meterListByType = this.meterList.filter(function(obj) {
      return obj.type == type;
    });

    for (let i=0; i < meterListByType.length; i++) {

      const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
      const header = Object.keys(meterListByType[i].data[0]);

      header.splice(0, 4); // remove 1st 4 headers
      header.splice(0, 1, "meterNumber"); // add meterNumber
      
      csv = meterListByType[i].data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
      
      // add meterNumber as first cell
      for (let j=0; j < csv.length; j++) {
        csv[j] = '"' +meterListByType[i].meterNumber +  '"' + csv[j];
      }

      csv.unshift(header.join(','));
      csv = csv.join('\r\n');

      //Download the file as CSV
      var downloadLink = document.createElement("a");
      var blob = new Blob(["\ufeff", csv]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = "Verifi_"+type+"_Meter_Data_Dump.csv";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
    
  }
}