import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db-service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db-service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-import-meter-data',
  templateUrl: './import-meter-data.component.html',
  styleUrls: ['./import-meter-data.component.css', '../electricity.component.css']
})
export class ImportMeterDataComponent implements OnInit {
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: string;
  quickView: Array<IdbUtilityMeterData>;
  import: Array<IdbUtilityMeterData>;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
  }


  meterDataImport(source: string, files: FileList) {
    // Clear with each upload
    this.quickView = new Array();
    this.importError = '';
    this.import = new Array();
    let allowedHeaders: Array<string>;

    if (source == 'Electricity') {
      allowedHeaders = ["meterNumber", "readDate", "totalEnergyUse", "totalDemand", "totalCost", "unit", "basicCharge", "supplyBlockAmt", "supplyBlockCharge", "flatRateAmt", "flatRateCharge", "peakAmt", "peakCharge", "offpeakAmt", "offpeakCharge", "demandBlockAmt", "demandBlockCharge", "genTransCharge", "deliveryCharge", "transCharge", "powerFactorCharge", "businessCharge", "utilityTax", "latePayment", "otherCharge"];
    } else {
      allowedHeaders = ["meterNumber", "readDate", "totalEnergyUse", "commodityCharge", "deliveryCharge", "otherCharge", "unit"];
    }

    if (files && files.length > 0) {
      let file: File = files.item(0);

      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].replace('\r', '').split(",");

        let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
        // if contains.. not if in the same order
        if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

          for (var i = 1; i < lines.length; i++) {
            const currentline = lines[i].split(",");
            let idbMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter == currentline['meterNumber'] });
            //TODO: Ignoring meter data without a matching meter with the same meterNumber
            //add some sort of error handling/messaging
            if (idbMeter) {
              const obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter.id, idbMeter.facilityId, idbMeter.accountId);
              for (var j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j];
              }
              // Read csv and push to obj array.
              this.import.push(obj);
              // Push the first 3 results to a quick view array
              if (i < 4) {
                this.quickView.push(obj);
              }
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

  resetImport() {
    this.emitClose.emit(true);
  }

  async meterAddCSV() {
    //TODO: Add loading message
    await this.import.forEach(importItem => {
      this.utilityMeterDataDbService.add(importItem);
    });
    this.resetImport();
  }
}
