import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-import-meter-data-wizard',
  templateUrl: './import-meter-data-wizard.component.html',
  styleUrls: ['./import-meter-data-wizard.component.css']
})
export class ImportMeterDataWizardComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: boolean;
  importMeterData: Array<any>;
  importMeterDataFileType: string;
  constructor() { }

  ngOnInit(): void {
  }


  meterDataImport(files: FileList) {
    // Clear with each upload
    // this.quickView = new Array();
    this.importError = undefined;
    // this.import = new Array();

    if (files && files.length > 0) {
      let file: File = files.item(0);

      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        let lines: Array<string> = csv.split("\n");
        let headers: Array<string> = lines[0].replace('\r', '').split(",");
        let electricityHeaders: Array<string> = ["Meter Number", "Read Date", "Total Energy", "Total Demand", "Total Cost", "Basic Charge", "Supply Block Amount", "Supply Block Charge", "Flat Rate Amount", "Flat Rate Charge", "Peak Amount", "Peak Charge", "Off Peak Amount", "Off Peak Charge", "Demand Block Amount", "Demand Block Charge", "Generation and Transmission Charge", "Delivery Charge", "Transmission Charge", "Power Factor Charge", "Local Business Charge", "Local Utility Tax", "Late Payment", "Other Charge"];
        let nonElectricityHeaders: Array<string> = ["Meter Number", "Read Date", "Total Consumption", "Total Cost", "Commodity Charge", "Delivery Charge", "Other Charge"];

        if (JSON.stringify(headers) === JSON.stringify(electricityHeaders)) {
          this.importMeterDataFileType = 'Electricity';
          this.importMeterData = new Array();
          this.importError = false;
        } else if (JSON.stringify(headers) === JSON.stringify(nonElectricityHeaders)) {
          this.importMeterDataFileType = 'Non Electricity';
          this.importMeterData = new Array();
          this.importError = false;
        } else {
          this.importError = true;
        }


        // let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
        //   for (var i = 1; i < lines.length; i++) {
        //     let currentLine: Array<string> = lines[i].split(",");
        //     let idbMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.meterNumber == currentLine[0] });
        //     if (idbMeter) {
        //       // let allowedHeaders: Array<string> = this.getAllowedHeaders(idbMeter);
        //       // if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {
        //       //TODO: Ignoring meter data without a matching meter with the same meterNumber
        //       //add some sort of error handling/messaging
        //       let obj: IdbUtilityMeterData;
        //       if (idbMeter.source == 'Electricity') {
        //         obj = this.getElectricityMeterDataObject(idbMeter, currentLine);
        //       } else {
        //         obj = this.getOtherSourceMeterDataObject(idbMeter, currentLine)
        //       }
        //       // Read csv and push to obj array.
        //       this.import.push(obj);
        //       // Push the first 3 results to a quick view array
        //       if (i < 4) {
        //         this.quickView.push(obj);
        //       }
        //     } else {
        //       console.log('no number')
        //     }
        //   }
        //   // else {
        //   //   // csv didn't match -> Show error
        //   //   this.importError = "Error with file. Please match your file to the provided template.";
        //   //   return false;
        //   // }
        //   // }
      }
    }
  }

  close() {
    this.emitClose.emit(true);
  }
}
