import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-import-meter-data',
  templateUrl: './import-meter-data.component.html',
  styleUrls: ['./import-meter-data.component.css']
})
export class ImportMeterDataComponent implements OnInit {
  // @Input()
  // selectedSource: string;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: string;
  quickView: Array<IdbUtilityMeterData>;
  import: Array<IdbUtilityMeterData>;
  electricityDataFilters: Array<ElectricityDataFilters>;
  supplyDemandCharge: SupplyDemandChargeFilters;
  taxAndOther: TaxAndOtherFilters;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataService: UtilityMeterDataService,
    private loadingService: LoadingService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    // let electricityDataFilters: ElectricityDataFilters = this.utilityMeterDataService.electricityInputFilters.getValue();
    // this.taxAndOther = electricityDataFilters.taxAndOther;
    // this.supplyDemandCharge = electricityDataFilters.supplyDemandCharge;
  }

  meterDataImport(files: FileList) {
    // Clear with each upload
    this.quickView = new Array();
    this.importError = undefined;
    this.import = new Array();

    if (files && files.length > 0) {
      let file: File = files.item(0);

      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        let lines: Array<string> = csv.split("\n");
        let headers: Array<string> = lines[0].replace('\r', '').split(",");

        let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
        for (var i = 1; i < lines.length; i++) {
          let currentLine: Array<string> = lines[i].split(",");
          let idbMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.meterNumber == currentLine[0] });
          if (idbMeter) {
            // let allowedHeaders: Array<string> = this.getAllowedHeaders(idbMeter);
            // if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {
            //TODO: Ignoring meter data without a matching meter with the same meterNumber
            //add some sort of error handling/messaging
            let obj: IdbUtilityMeterData;
            if (idbMeter.source == 'Electricity') {
              obj = this.getElectricityMeterDataObject(idbMeter, currentLine);
            } else {
              obj = this.getOtherSourceMeterDataObject(idbMeter, currentLine)
            }
            // Read csv and push to obj array.
            this.import.push(obj);
            // Push the first 3 results to a quick view array
            if (i < 4) {
              this.quickView.push(obj);
            }
          } else {
            console.log('no number')
          }
        }
        // else {
        //   // csv didn't match -> Show error
        //   this.importError = "Error with file. Please match your file to the provided template.";
        //   return false;
        // }
        // }
      }
    }
  }

  resetImport() {
    this.emitClose.emit(true);
  }

  async meterAddCSV() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Importing Meter Data...");
    //TODO: Add loading message
    await this.import.forEach(importItem => {
      this.utilityMeterDataDbService.add(importItem);
    });
    this.loadingService.setLoadingStatus(false);
    this.resetImport();
  }

  getElectricityMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter.id, idbMeter.facilityId, idbMeter.accountId);
    //  currentLine["meterNumber"]
    obj.readDate = new Date(currentLine[1]);
    obj.totalEnergyUse = Number(currentLine[2]);
    obj.totalDemand = Number(currentLine[3]);
    obj.totalCost = Number(currentLine[4]);
    // obj.unit = currentLine["unit"];
    obj.basicCharge = Number(currentLine[5]);
    obj.supplyBlockAmount = Number(currentLine[6]);
    obj.supplyBlockCharge = Number(currentLine[7]);
    obj.flatRateAmount = Number(currentLine[8]);
    obj.flatRateCharge = Number(currentLine[9]);
    obj.peakAmount = Number(currentLine[10]);
    obj.peakCharge = Number(currentLine[11]);
    obj.offPeakAmount = Number(currentLine[12]);
    obj.offPeakCharge = Number(currentLine[13]);
    obj.demandBlockAmount = Number(currentLine[14]);
    obj.demandBlockCharge = Number(currentLine[15]);
    obj.generationTransmissionCharge = Number(currentLine[16]);
    obj.deliveryCharge = Number(currentLine[17]);
    obj.transmissionCharge = Number(currentLine[18]);
    obj.powerFactorCharge = Number(currentLine[19]);
    obj.businessCharge = Number(currentLine[20]);
    obj.utilityTax = Number(currentLine[21]);
    obj.latePayment = Number(currentLine[22]);
    obj.otherCharge = Number(currentLine[23]);
    return obj;
  }

  getOtherSourceMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter.id, idbMeter.facilityId, idbMeter.accountId);
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(idbMeter.startingUnit);
    obj.readDate = new Date(currentLine[1]);
    if (isEnergyUnit) {
      obj.totalEnergyUse = Number(currentLine[2]);
    } else {
      obj.totalVolume = Number(currentLine[2]);
      obj.totalEnergyUse = obj.totalVolume * idbMeter.heatCapacity;
    }
    obj.totalCost = Number(currentLine[3]);
    obj.commodityCharge = Number(currentLine[4]);
    // obj.totalCost = Number(currentLine["totalCost"]);
    // obj.unit = currentLine["unit"];
    obj.deliveryCharge = Number(currentLine[5]);
    obj.otherCharge = Number(currentLine[6]);
    return obj;
  }

  getAllowedHeaders(idbMeter: IdbUtilityMeter): Array<string> {
    if (idbMeter.source == 'Electricity') {
      return ["Meter Number", "Read Date", "Total Energy", "Total Demand", "Total Cost", "Basic Charge", "Supply Block Amount", "Supply Block Charge", "Flat Rate Amount", "Flat Rate Charge", "Peak Amount", "Peak Charge", "Off Peak Amount", "Off Peak Charge", "Demand Block Amount", "Demand Block Charge", "Generation and Transmission Charge", "Delivery Charge", "Transmission Charge", "Power Factor Charge", "Local Business Charge", "Local Utility Tax", "Late Payment", "Other Charge"];
    } else {
      return ["Meter Number", "Read Date", "Total Consumption", "Total Cost", "Commodity Charge", "Delivery Charge", "Other Charge"];
    }
  }

  checkIsElectricity(currentLine: Array<string>): boolean {
    let check: string = currentLine.find(line => { return line == 'Commodity Charge' });
    return check == undefined;
  }
}
