import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class ExportToExcelTemplateService {

  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private facilityDbService: FacilitydbService) { }


  exportFacilityData() {
    let workbook: ExcelJS.Workbook = this.getWorkBook();
    workbook.xlsx.writeBuffer().then(excelData => {
      let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      let a = document.createElement("a");
      let url = window.URL.createObjectURL(blob);
      a.href = url;
      let date = new Date();
      let datePipe = new DatePipe('en-us');
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let facilityName: string = facility.name;

      a.download = facilityName.replaceAll(' ', '-') + "-" + datePipe.transform(date, 'MM-dd-yyyy');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  getWorkBook(): ExcelJS.Workbook {
    let workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
    workbook.properties.date1904 = true;
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.addWorksheet('Help');
    workbook.worksheets[1] = this.getMetersWorksheet(workbook);
    workbook.worksheets[2] = this.getElectricityWorksheet(workbook);
    workbook.worksheets[3] = this.getNonElectricityWorksheet(workbook);
    workbook.worksheets[4] = this.getPredictorWorksheet(workbook);

    return workbook;
  }

  getMetersWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Meters-Utilities');
    worksheet.getCell('A1').value = 'Meter Number';
    worksheet.getCell('B1').value = 'Account Number';
    worksheet.getCell('C1').value = 'Source';
    worksheet.getCell('D1').value = 'Meter Name';
    worksheet.getCell('E1').value = 'Utility Supplier';
    worksheet.getCell('F1').value = 'Notes';
    worksheet.getCell('G1').value = 'Building / Location';
    worksheet.getCell('H1').value = 'Meter Group';
    worksheet.getCell('I1').value = 'Phase';
    worksheet.getCell('J1').value = 'Fuel';
    worksheet.getCell('K1').value = 'Collection Unit';
    worksheet.getCell('L1').value = 'Heat Capacity';
    worksheet.getCell('M1').value = 'Site To Source';

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let index: number = 2;
    facilityMeters.forEach(meter => {
      worksheet.getCell('A' + index).value = meter.meterNumber;
      worksheet.getCell('B' + index).value = meter.accountNumber;
      worksheet.getCell('C' + index).value = meter.source;
      worksheet.getCell('D' + index).value = meter.name;
      worksheet.getCell('E' + index).value = meter.supplier;
      worksheet.getCell('F' + index).value = meter.notes;
      worksheet.getCell('G' + index).value = meter.location;
      worksheet.getCell('H' + index).value = meter.group;
      worksheet.getCell('I' + index).value = meter.phase;
      worksheet.getCell('J' + index).value = meter.fuel;
      worksheet.getCell('K' + index).value = meter.startingUnit;
      worksheet.getCell('L' + index).value = meter.heatCapacity;
      worksheet.getCell('M' + index).value = meter.siteToSource;
      index++;
    })

    return worksheet;
  }

  getElectricityWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Electricity');
    worksheet.getCell('A1').value = 'Meter Number';
    worksheet.getCell('B1').value = 'Read Date';
    worksheet.getCell('C1').value = 'Total Energy';
    worksheet.getCell('D1').value = 'Total Demand';
    worksheet.getCell('E1').value = 'Total Cost';
    worksheet.getCell('F1').value = 'Basic Charge';
    worksheet.getCell('G1').value = 'Supply Block Amount';
    worksheet.getCell('H1').value = 'Supply Block Charge';
    worksheet.getCell('I1').value = 'Flat Rate Amount';
    worksheet.getCell('J1').value = 'Flat Rate Charge';
    worksheet.getCell('K1').value = 'Peak Amount';
    worksheet.getCell('L1').value = 'Peak Charge';
    worksheet.getCell('M1').value = 'Off Peak Amount';
    worksheet.getCell('N1').value = 'Off Peak Charge';
    worksheet.getCell('O1').value = 'Demand Block Amount';
    worksheet.getCell('P1').value = 'Demand Block Charge';
    worksheet.getCell('Q1').value = 'Generation and Transmission Charge';
    worksheet.getCell('R1').value = 'Delivery Charge';
    worksheet.getCell('S1').value = 'Transmission Charge';
    worksheet.getCell('T1').value = 'Power Factor Charge';
    worksheet.getCell('U1').value = 'Local Business Charge';
    worksheet.getCell('V1').value = 'Local Utility Tax';
    worksheet.getCell('W1').value = 'Late Payment';
    worksheet.getCell('X1').value = 'Other Charge';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 2;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true);
      meterData.forEach(dataReading => {
        worksheet.getCell('A' + index).value = meter.meterNumber;
        worksheet.getCell('B' + index).value = dataReading.readDate;
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        worksheet.getCell('D' + index).value = dataReading.totalDemand;
        worksheet.getCell('E' + index).value = dataReading.totalCost;
        worksheet.getCell('F' + index).value = dataReading.basicCharge;
        worksheet.getCell('G' + index).value = dataReading.supplyBlockAmount;
        worksheet.getCell('H' + index).value = dataReading.supplyBlockCharge;
        worksheet.getCell('I' + index).value = dataReading.flatRateAmount;
        worksheet.getCell('J' + index).value = dataReading.flatRateCharge;
        worksheet.getCell('K' + index).value = dataReading.peakAmount;
        worksheet.getCell('L' + index).value = dataReading.peakCharge;
        worksheet.getCell('M' + index).value = dataReading.offPeakAmount;
        worksheet.getCell('N' + index).value = dataReading.offPeakCharge;
        worksheet.getCell('O' + index).value = dataReading.demandBlockAmount;
        worksheet.getCell('P' + index).value = dataReading.demandBlockCharge;
        worksheet.getCell('Q' + index).value = dataReading.generationTransmissionCharge;
        worksheet.getCell('R' + index).value = dataReading.deliveryCharge;
        worksheet.getCell('S' + index).value = dataReading.transmissionCharge;
        worksheet.getCell('T' + index).value = dataReading.powerFactorCharge;
        worksheet.getCell('U' + index).value = dataReading.businessCharge;
        worksheet.getCell('V' + index).value = dataReading.utilityTax;
        worksheet.getCell('W' + index).value = dataReading.latePayment;
        worksheet.getCell('X' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  getNonElectricityWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Non-electricity');
    worksheet.getCell('A1').value = 'Meter Number';
    worksheet.getCell('B1').value = 'Read Date';
    worksheet.getCell('C1').value = 'Total Consumption';
    worksheet.getCell('D1').value = 'Total Cost';
    worksheet.getCell('E1').value = 'Commodity Charge';
    worksheet.getCell('F1').value = 'Delivery Charge';
    worksheet.getCell('G1').value = 'Other Charge';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source != 'Electricity' });
    let index: number = 2;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true);
      meterData.forEach(dataReading => {
        worksheet.getCell('A' + index).value = meter.meterNumber;
        worksheet.getCell('B' + index).value = dataReading.readDate;
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        worksheet.getCell('E' + index).value = dataReading.commodityCharge;
        worksheet.getCell('F' + index).value = dataReading.deliveryCharge;
        worksheet.getCell('G' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  getPredictorWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Predictors');
    let alpha = Array.from(Array(26)).map((e, i) => i + 65);
    let alphabet = alpha.map(x => { return String.fromCharCode(x) });
    worksheet.getCell('A1').value = 'Date';
    let alphaIndex: number = 1;
    let predictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    predictorEntries[0].predictors.forEach(predictor => {
      let letter: string = alphabet[alphaIndex];
      worksheet.getCell(letter + '1').value = predictor.name;
      alphaIndex++;
    });
    let index: number = 2;
    predictorEntries.forEach(entry => {
      worksheet.getCell('A' + index).value = entry.date;
      alphaIndex = 1;
      entry.predictors.forEach(predictor => {
        let letter: string = alphabet[alphaIndex];
        worksheet.getCell(letter + index).value = predictor.amount;
        alphaIndex++;
      });
      index++;
    })
    return worksheet;
  }

}
