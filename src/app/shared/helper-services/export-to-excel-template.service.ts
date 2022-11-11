import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AgreementType, AgreementTypes, ScopeOption, ScopeOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ExportToExcelTemplateService {

  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService) { }


  exportFacilityData(facilityId?: string) {
    let workbook: ExcelJS.Workbook = this.getWorkBook();
    workbook.xlsx.writeBuffer().then(excelData => {
      let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      let a = document.createElement("a");
      let url = window.URL.createObjectURL(blob);
      a.href = url;
      let date = new Date();
      let datePipe = new DatePipe('en-us');
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let accountName: string = account.name;

      a.download = accountName.replaceAll(' ', '-') + "-" + datePipe.transform(date, 'MM-dd-yyyy');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  getWorkBook(facilityId?: string): ExcelJS.Workbook {
    let workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
    workbook.properties.date1904 = true;
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.addWorksheet('Help');
    workbook.worksheets[1] = this.getFacilityWorksheet(workbook, facilityId);
    workbook.worksheets[2] = this.getMetersWorksheet(workbook, facilityId);
    workbook.worksheets[3] = this.getElectricityWorksheet(workbook, facilityId);
    workbook.worksheets[4] = this.getNonElectricityWorksheet(workbook, facilityId);
    workbook.worksheets[5] = this.getPredictorWorksheet(workbook, facilityId);

    return workbook;
  }

  getFacilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Facilities');
    worksheet.getCell('A1').value = 'Facility Name';
    worksheet.getCell('B1').value = 'Address';
    worksheet.getCell('C1').value = 'Country';
    worksheet.getCell('D1').value = 'State';
    worksheet.getCell('E1').value = 'City';
    worksheet.getCell('F1').value = 'Zip';
    worksheet.getCell('G1').value = 'NAICS Code 2';
    worksheet.getCell('H1').value = 'NAICS Code 3';
    worksheet.getCell('I1').value = 'Contact Name';
    worksheet.getCell('J1').value = 'Contact Phone';
    worksheet.getCell('K1').value = 'Contact Email';

    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      accountFacilities = accountFacilities.filter(facility => { return facility.guid == facilityId });
    }
    let index: number = 2;
    accountFacilities.forEach(facility => {
      worksheet.getCell('A' + index).value = facility.name;
      worksheet.getCell('B' + index).value = facility.address;
      worksheet.getCell('C' + index).value = facility.country;
      worksheet.getCell('D' + index).value = facility.state;
      worksheet.getCell('E' + index).value = facility.city;
      worksheet.getCell('F' + index).value = facility.zip;
      worksheet.getCell('G' + index).value = facility.naics2;
      worksheet.getCell('H' + index).value = facility.naics3;
      worksheet.getCell('I' + index).value = facility.contactName;
      worksheet.getCell('J' + index).value = facility.contactPhone;
      worksheet.getCell('K' + index).value = facility.contactEmail;
      index++;
    })
    return worksheet;
  }

  getMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Meters-Utilities');
    worksheet.getCell('A1').value = 'Facility Name';
    worksheet.getCell('B1').value = 'Meter Number';
    worksheet.getCell('C1').value = 'Account Number';
    worksheet.getCell('D1').value = 'Source';
    worksheet.getCell('E1').value = 'Meter Name';
    worksheet.getCell('F1').value = 'Utility Supplier';
    worksheet.getCell('G1').value = 'Notes';
    worksheet.getCell('H1').value = 'Building / Location';
    worksheet.getCell('I1').value = 'Meter Group';
    worksheet.getCell('J1').value = 'Phase';
    worksheet.getCell('K1').value = 'Fuel';
    worksheet.getCell('L1').value = 'Collection Unit';
    worksheet.getCell('M1').value = 'Heat Capacity';
    worksheet.getCell('N1').value = 'Site To Source';
    worksheet.getCell('O1').value = 'Scope';
    worksheet.getCell('P1').value = 'Agreement Type';
    worksheet.getCell('Q1').value = 'Include In Energy';
    worksheet.getCell('R1').value = 'Retain RECS';

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 2;
    facilityMeters.forEach(meter => {
      let facilityName: string = accountFacilities.find(facility => { return facility.guid == meter.facilityId }).name;
      worksheet.getCell('A' + index).value = facilityName;
      worksheet.getCell('B' + index).value = meter.meterNumber;
      worksheet.getCell('C' + index).value = meter.accountNumber;
      worksheet.getCell('D' + index).value = meter.source;
      worksheet.getCell('E' + index).value = meter.name;
      worksheet.getCell('F' + index).value = meter.supplier;
      worksheet.getCell('G' + index).value = meter.notes;
      worksheet.getCell('H' + index).value = meter.location;
      worksheet.getCell('I' + index).value = meter.group;
      worksheet.getCell('J' + index).value = meter.phase;
      worksheet.getCell('K' + index).value = meter.fuel;
      worksheet.getCell('L' + index).value = meter.startingUnit;
      worksheet.getCell('M' + index).value = meter.heatCapacity;
      worksheet.getCell('N' + index).value = meter.siteToSource;
      worksheet.getCell('O' + index).value = this.getScope(meter.scope);
      worksheet.getCell('P' + index).value = this.getAgreementType(meter.agreementType);
      worksheet.getCell('Q' + index).value = this.getYesNo(meter.includeInEnergy);
      worksheet.getCell('R' + index).value = this.getYesNo(meter.retainRECs);
      index++;
    })
    return worksheet;
  }

  getYesNo(bool: boolean): 'Yes' | 'No' {
    if (bool) {
      return 'Yes';
    }
    return 'No';
  }

  getScope(scope: number): string {
    let selectedScope: ScopeOption = ScopeOptions.find(option => { return option.value == scope });
    if (selectedScope) {
      return selectedScope.scope + ': ' + selectedScope.optionLabel;
    }
    return;
  }

  getAgreementType(agreementType: number): string {
    let selectedType: AgreementType = AgreementTypes.find(type => { return agreementType == type.value });
    if (selectedType) {
      return selectedType.typeLabel;
    }
    return;
  }

  getElectricityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Electricity');
    worksheet.getCell('A1').value = 'Meter Number';
    worksheet.getCell('B1').value = 'Read Date';
    worksheet.getCell('C1').value = 'Total Consumption';
    worksheet.getCell('D1').value = 'Total Real Demand';
    worksheet.getCell('E1').value = 'Total Billed Demand';
    worksheet.getCell('F1').value = 'Total Cost';
    worksheet.getCell('G1').value = 'Non-energy Charge';
    worksheet.getCell('H1').value = 'Block 1 Consumption';
    worksheet.getCell('I1').value = 'Block 1 Consumption Charge';
    worksheet.getCell('J1').value = 'Block 2 Consumption';
    worksheet.getCell('K1').value = 'Block 2 Consumption Charge';
    worksheet.getCell('L1').value = 'Block 3 Consumption';
    worksheet.getCell('M1').value = 'Block 3 Consumption Charge';
    worksheet.getCell('N1').value = 'Other Consumption';
    worksheet.getCell('O1').value = 'Other Consumption Charge';
    worksheet.getCell('P1').value = 'On Peak Amount';
    worksheet.getCell('Q1').value = 'On Peak Charge';
    worksheet.getCell('R1').value = 'Off Peak Amount';
    worksheet.getCell('S1').value = 'Off Peak Charge';
    worksheet.getCell('T1').value = 'Transmission & Delivery Charge';
    worksheet.getCell('U1').value = 'Power Factor';
    worksheet.getCell('V1').value = 'Power Factor Charge';
    worksheet.getCell('W1').value = 'Local Sales Tax';
    worksheet.getCell('X1').value = 'State Sales Tax';
    worksheet.getCell('Y1').value = 'Late Payment';
    worksheet.getCell('Z1').value = 'Other Charge';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 2;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true);
      meterData.forEach(dataReading => {
        worksheet.getCell('A' + index).value = meter.meterNumber;
        worksheet.getCell('B' + index).value = dataReading.readDate;
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        //TODO: update '0' when new fields added and names changed
        worksheet.getCell('D' + index).value = dataReading.totalRealDemand;
        worksheet.getCell('E' + index).value = dataReading.totalBilledDemand;
        worksheet.getCell('F' + index).value = dataReading.totalCost;
        worksheet.getCell('G' + index).value = dataReading.nonEnergyCharge;
        worksheet.getCell('H' + index).value = dataReading.block1Consumption;
        worksheet.getCell('I' + index).value = dataReading.block1ConsumptionCharge;
        worksheet.getCell('J' + index).value = dataReading.block2Consumption;
        worksheet.getCell('K' + index).value = dataReading.block2ConsumptionCharge;
        worksheet.getCell('L' + index).value = dataReading.block3Consumption;
        worksheet.getCell('M' + index).value = dataReading.block3ConsumptionCharge;
        worksheet.getCell('N' + index).value = dataReading.otherConsumption;
        worksheet.getCell('O' + index).value = dataReading.otherConsumptionCharge;
        worksheet.getCell('P' + index).value = dataReading.onPeakAmount;
        worksheet.getCell('Q' + index).value = dataReading.onPeakCharge;
        worksheet.getCell('R' + index).value = dataReading.offPeakAmount;
        worksheet.getCell('S' + index).value = dataReading.offPeakCharge;
        worksheet.getCell('T' + index).value = dataReading.totalRealDemand;
        worksheet.getCell('U' + index).value = dataReading.powerFactor;
        worksheet.getCell('V' + index).value = dataReading.powerFactorCharge;
        worksheet.getCell('W' + index).value = dataReading.localSalesTax;
        worksheet.getCell('X' + index).value = dataReading.stateSalesTax;
        worksheet.getCell('Y' + index).value = dataReading.latePayment;
        worksheet.getCell('Z' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  getNonElectricityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Non-electricity');
    worksheet.getCell('A1').value = 'Meter Number';
    worksheet.getCell('B1').value = 'Read Date';
    worksheet.getCell('C1').value = 'Total Consumption';
    worksheet.getCell('D1').value = 'Total Cost';
    worksheet.getCell('E1').value = 'Commodity Charge';
    worksheet.getCell('F1').value = 'Delivery Charge';
    worksheet.getCell('G1').value = 'Other Charge';
    worksheet.getCell('H1').value = 'Demand Usage';
    worksheet.getCell('I1').value = 'Demand Charge';
    worksheet.getCell('J1').value = 'Local Sales Tax';
    worksheet.getCell('K1').value = 'State Sales Tax';
    worksheet.getCell('L1').value = 'Late Payment';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
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
        worksheet.getCell('H' + index).value = dataReading.demandUsage;
        worksheet.getCell('I' + index).value = dataReading.demandCharge;
        worksheet.getCell('J' + index).value = dataReading.localSalesTax;
        worksheet.getCell('K' + index).value = dataReading.stateSalesTax;
        worksheet.getCell('L' + index).value = dataReading.latePayment;
        index++;
      })
    })
    return worksheet;
  }

  getPredictorWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Predictors');
    let alpha = Array.from(Array(26)).map((e, i) => i + 65);
    let alphabet = alpha.map(x => { return String.fromCharCode(x) });
    worksheet.getCell('A1').value = 'Facility Name';
    worksheet.getCell('B1').value = 'Date';
    let alphaIndex: number = 2;

    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      facilities = facilities.filter(facility => { return facility.guid == facilityId });
    }
    let predictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (facilityId) {
      predictorEntries = predictorEntries.filter(entry => { return entry.facilityId == facilityId });
    }
    let predictorCellMap: Array<{ letter: string, predictorName: string }> = new Array();
    if (predictorEntries.length != 0) {
      // predictorEntries[0].predictors.forEach(predictor => {
      let predictorNames: Array<string> = this.getAllPredictorNames(predictorEntries, facilities);
      predictorNames.forEach(name => {
        let letter: string = alphabet[alphaIndex];
        worksheet.getCell(letter + '1').value = name;
        predictorCellMap.push({
          letter: letter,
          predictorName: name
        })
        alphaIndex++;
      });
      let index: number = 2;
      predictorEntries.forEach(entry => {
        let facilityName: string = facilities.find(facility => { return facility.guid == entry.facilityId }).name;
        worksheet.getCell('A' + index).value = facilityName;
        worksheet.getCell('B' + index).value = new Date(entry.date).toISOString()
        // alphaIndex = 1;
        entry.predictors.forEach(predictor => {
          // let letter: string = alphabet[alphaIndex];
          let letter = predictorCellMap.find(mapObj => { return mapObj.predictorName == predictor.name }).letter;
          worksheet.getCell(letter + index).value = predictor.amount;
          // alphaIndex++;
        });
        index++;
      });
    }
    return worksheet;
  }


  getAllPredictorNames(predictorEntries: Array<IdbPredictorEntry>, facilities: Array<IdbFacility>): Array<string> {
    let predictorNames: Array<string> = new Array();
    facilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictorEntry> = predictorEntries.filter(entry => { return entry.facilityId == facility.guid });
      if (facilityPredictors.length > 0) {
        let facilityPredictorNames: Array<string> = facilityPredictors[0].predictors.map(predictor => { return predictor.name })
        // debugger
        predictorNames = _.union(predictorNames, facilityPredictorNames)
      }
    });
    return predictorNames;
  }

}
