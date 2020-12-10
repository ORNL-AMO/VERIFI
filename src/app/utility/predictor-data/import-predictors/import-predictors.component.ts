import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IdbPredictorEntry } from 'src/app/models/idb';

@Component({
  selector: 'app-import-predictors',
  templateUrl: './import-predictors.component.html',
  styleUrls: ['./import-predictors.component.css']
})
export class ImportPredictorsComponent implements OnInit {
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: string;
  quickView: Array<IdbPredictorEntry>;
  importArr: Array<IdbPredictorEntry>;

  constructor() { }

  ngOnInit(): void {
  }

  cancel() {
    this.emitClose.emit(true);
  }

  importData(files: FileList) {
    // Clear with each upload
    this.quickView = new Array();
    this.importError = undefined;
    this.importArr = new Array();
    let allowedHeaders: Array<string>;

    // if (this.selectedSource == 'Electricity') {
    //   allowedHeaders = ["meterNumber", "readDate", "totalEnergyUse", "totalDemand", "totalCost", "unit", "basicCharge", "supplyBlockAmt", "supplyBlockCharge", "flatRateAmt", "flatRateCharge", "peakAmt", "peakCharge", "offpeakAmt", "offpeakCharge", "demandBlockAmt", "demandBlockCharge", "genTransCharge", "deliveryCharge", "transCharge", "powerFactorCharge", "businessCharge", "utilityTax", "latePayment", "otherCharge"];
    // } else {
    //   allowedHeaders = ["meterNumber", "readDate", "totalEnergyUse", "commodityCharge", "deliveryCharge", "otherCharge", "unit"];
    // }

    // if (files && files.length > 0) {
    //   let file: File = files.item(0);

    //   let reader: FileReader = new FileReader();
    //   reader.readAsText(file);
    //   reader.onload = (e) => {
    //     let csv: string = reader.result as string;
    //     const lines = csv.split("\n");
    //     const headers = lines[0].replace('\r', '').split(",");

    //     let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    //     // if contains.. not if in the same order
    //     if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

    //       for (var i = 1; i < lines.length; i++) {
    //         const currentline = lines[i].split(",");
    //         let idbMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter == currentline['meterNumber'] });
    //         //TODO: Ignoring meter data without a matching meter with the same meterNumber
    //         //add some sort of error handling/messaging
    //         if (idbMeter) {
    //           const obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter.id, idbMeter.facilityId, idbMeter.accountId);
    //           for (var j = 0; j < headers.length; j++) {
    //             obj[headers[j]] = currentline[j];
    //           }
    //           // Read csv and push to obj array.
    //           this.import.push(obj);
    //           // Push the first 3 results to a quick view array
    //           if (i < 4) {
    //             this.quickView.push(obj);
    //           }
    //         }
    //       }
    //     } else {
    //       // csv didn't match -> Show error
    //       this.importError = "Error with file. Please match your file to the provided template.";
    //       return false;
    //     }
    //   }
    // }
  }


  addPredictors(){
    
  }
}
