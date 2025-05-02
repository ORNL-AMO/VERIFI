import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Injectable({
  providedIn: 'root'
})
export class ExportToEnergyTresureHuntFormService {

  constructor(private loadingService: LoadingService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private accountDbService: AccountdbService
  ) { }

  exportFacilityData(startYear: number, hostFacilityId: string, exchangeFacilityId: string) {
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/ETH_Request_Form_Blank.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        this.fillWorkbook(workbook, startYear, hostFacilityId, exchangeFacilityId);
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          // let date = new Date();
          // let datePipe = new DatePipe('en-us');
          // let accountName: string = account.name;
          // accountName = accountName.replaceAll(' ', '-');
          // accountName = accountName.replaceAll('.', '_');
          a.download = 'ETH_Request_Form';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.loadingService.setLoadingStatus(false);
        });
      })
    };
    this.loadingService.setLoadingMessage('Exporting to .xlsx template');
    this.loadingService.setLoadingStatus(true);
    request.send();
  }

  fillWorkbook(workbook: ExcelJS.Workbook, startYear: number, hostFacilityId: string, exchangeFacilityId: string) {
    //host plant summary
    let hostPlantSummaryWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Host Plant Summary');
    let hostFacility: IdbFacility = this.facilityDbService.getFacilityById(hostFacilityId);
    this.fillPlantSummary(hostPlantSummaryWorksheet, hostFacility)
    //host plant utilities
    let hostPlantUtilitiesWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Host Plant Utilities');
    this.fillPlantUtilities(hostPlantUtilitiesWorksheet, hostFacility, startYear);

    if (exchangeFacilityId) {
      //exchange plant summary
      let exchangeFacility: IdbFacility = this.facilityDbService.getFacilityById(exchangeFacilityId);
      let exchangePlantSummaryWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Exchange Plant Summary');
      this.fillPlantSummary(exchangePlantSummaryWorksheet, exchangeFacility);
      //exchange plant utilities
      let exchangePlantUtilitiesWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Exchange Plant Utilities');
      this.fillPlantUtilities(exchangePlantUtilitiesWorksheet, exchangeFacility, startYear);
    }
    workbook.getWorksheet("Cover Page");
  }

  fillPlantSummary(worksheet: ExcelJS.Worksheet, facility: IdbFacility) {
    worksheet.getCell('C9').value = facility.name;
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    worksheet.getCell('C8').value = account.name;
  }

  fillPlantUtilities(worksheet: ExcelJS.Worksheet, facility: IdbFacility, startYear: number) {
    worksheet.getCell('C9').value = facility.name;
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facility.guid);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
    let energyMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return meter.source != 'Water Discharge' && meter.source != 'Water Intake'
    })
    let calanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(energyMeters, facilityMeterData, facility, false, { energyIsSource: false, neededUnits: 'MMBtu' }, [], [], [facility])
    //electricity
    let electricityMeters: Array<CalanderizedMeter> = calanderizedMeterData.filter(cMeter => { return cMeter.meter.source == 'Electricity' });
    let cellIndex: number = 8
    if (electricityMeters.length != 0) {
      let electricityMeterData: Array<MonthlyData> = electricityMeters.flatMap(cMeter => { return cMeter.monthlyData });
      //year 1
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = electricityMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          //NEED DEMAND IN CALANDERIZED DATA
          // let totalDemand: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
          //   return mData.
          // });
          worksheet.getCell('C' + cellIndex).value = startYear;
          worksheet.getCell('D' + cellIndex).value = new ConvertValue(totalEnergyUse, 'MMBtu', 'kWh').convertedValue;
          worksheet.getCell('G' + cellIndex).value = totalCost;
          // worksheet.getCell('F' + cellIndex).value = totalDemand;
        }

        cellIndex++;
      }
      //year 2
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = electricityMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          //NEED DEMAND IN CALANDERIZED DATA
          // let totalDemand: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
          //   return mData.
          // });
          worksheet.getCell('C' + cellIndex).value = startYear + 1;
          worksheet.getCell('D' + cellIndex).value = new ConvertValue(totalEnergyUse, 'MMBtu', 'kWh').convertedValue;
          worksheet.getCell('G' + cellIndex).value = totalCost;
          // worksheet.getCell('F' + cellIndex).value = totalDemand;
        }
        cellIndex++;
      }
    }

    //natural gas
    let naturalGasMeters: Array<CalanderizedMeter> = calanderizedMeterData.filter(cMeter => { return cMeter.meter.source == 'Natural Gas' });
    if (naturalGasMeters.length != 0) {
      let naturalGasMeterData: Array<MonthlyData> = naturalGasMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 38
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = naturalGasMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = naturalGasMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
    }
    //coalOil
    let otherFuelsMeters: Array<CalanderizedMeter> = calanderizedMeterData.filter(cMeter => { return cMeter.meter.source == 'Other Fuels' });
    if (otherFuelsMeters.length != 0) {
      let otherFuelsMeterData: Array<MonthlyData> = otherFuelsMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 68
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = otherFuelsMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = otherFuelsMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
    }

    //otherEnergy
    let otherEnergyMeters: Array<CalanderizedMeter> = calanderizedMeterData.filter(cMeter => { return cMeter.meter.source == 'Other Energy' });
    if (otherEnergyMeters.length != 0) {
      let otherEnergyMeterData: Array<MonthlyData> = otherEnergyMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 98
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = otherEnergyMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = otherEnergyMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('F' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
    }
    let facilityWaterMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return meter.source == 'Water Discharge' || meter.source == 'Water Intake'
    })
    let calanderizedWaterMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityWaterMeters, facilityMeterData, facility, false, { energyIsSource: false, neededUnits: 'kgal' }, [], [], [facility])
    //water
    let waterMeters: Array<CalanderizedMeter> = calanderizedWaterMeterData.filter(cMeter => {
      return cMeter.meter.source == 'Water Intake' && (cMeter.meter.waterIntakeType == 'Municipal (Non-potable)' || cMeter.meter.waterIntakeType == 'Municipal (Potable)')
    });
    if (waterMeters.length != 0) {
      let waterMeterData: Array<MonthlyData> = waterMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 128
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = waterMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyConsumption
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('G' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = waterMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyConsumption
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('D' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('G' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
    }
    //sewer
    let sewerMeters: Array<CalanderizedMeter> = calanderizedWaterMeterData.filter(cMeter => {
      return cMeter.meter.source == 'Water Discharge'
    });
    if (sewerMeters.length != 0) {
      let sewerMeterData: Array<MonthlyData> = sewerMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 128
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = sewerMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyConsumption
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('E' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('H' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = sewerMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyConsumption
          });
          let totalCost: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyCost
          });
          worksheet.getCell('E' + cellIndex).value = totalEnergyUse;
          worksheet.getCell('H' + cellIndex).value = totalCost;
        }
        cellIndex++;
      }
    }
    //self source water
    let selfSourcedWaterMeters: Array<CalanderizedMeter> = calanderizedWaterMeterData.filter(cMeter => {
      return cMeter.meter.source == 'Water Intake' && (cMeter.meter.waterIntakeType != 'Municipal (Non-potable)' && cMeter.meter.waterIntakeType != 'Municipal (Potable)')
    });
    if (selfSourcedWaterMeters.length != 0) {
      let selfSourcedWaterMeterData: Array<MonthlyData> = selfSourcedWaterMeters.flatMap(cMeter => { return cMeter.monthlyData });
      cellIndex = 128
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = selfSourcedWaterMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return date.getFullYear() == startYear && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyUse
          });
          worksheet.getCell('F' + cellIndex).value = totalEnergyUse;
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        let yearMonthData: Array<MonthlyData> = selfSourcedWaterMeterData.filter(mData => {
          let date: Date = new Date(mData.date);
          return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
        });
        if (yearMonthData.length != 0) {
          let totalEnergyUse: number = _.sumBy(yearMonthData, (mData: MonthlyData) => {
            return mData.energyConsumption
          });
          worksheet.getCell('F' + cellIndex).value = totalEnergyUse;
        }
        cellIndex++;
      }
    }
    //predictors (production)
    let facilityPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(facility.guid);
    //TODO: check for hours worked...
    let productionPredictors: Array<IdbPredictor> = facilityPredictors.filter(predictor => { return predictor.production })
    if (productionPredictors.length != 0) {
      //Only room for 3
      let p1: IdbPredictor = productionPredictors[0];
      let p1Data: Array<IdbPredictorData>;
      if (p1) {
        p1Data = this.predictorDataDbService.getByPredictorId(p1.guid);
        worksheet.getCell('D155').value = p1.name;
      }
      let p2: IdbPredictor = productionPredictors[1];
      let p2Data: Array<IdbPredictorData>;
      if (p2) {
        p2Data = this.predictorDataDbService.getByPredictorId(p2.guid);
        worksheet.getCell('E155').value = p2.name;
      }
      let p3: IdbPredictor = productionPredictors[2];
      let p3Data: Array<IdbPredictorData>;
      if (p3) {
        p3Data = this.predictorDataDbService.getByPredictorId(p3.guid);
        worksheet.getCell('F155').value = p3.name;
      }
      cellIndex = 156
      for (let i = 0; i < 12; i++) {
        if (p1) {
          let p1MonthData: Array<IdbPredictorData> = p1Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return date.getFullYear() == startYear && date.getMonth() == i;
          });
          if (p1MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p1MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('D' + cellIndex).value = totalPredictor;
          }
        }

        if (p2) {
          let p2MonthData: Array<IdbPredictorData> = p2Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return date.getFullYear() == startYear && date.getMonth() == i;
          });
          if (p2MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p2MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('E' + cellIndex).value = totalPredictor;
          }
        }
        if (p3) {
          let p3MonthData: Array<IdbPredictorData> = p3Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return date.getFullYear() == startYear && date.getMonth() == i;
          });
          if (p3MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p3MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('F' + cellIndex).value = totalPredictor;
          }
        }
        cellIndex++;
      }
      for (let i = 0; i < 12; i++) {
        if (p1) {
          let p1MonthData: Array<IdbPredictorData> = p1Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
          });
          if (p1MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p1MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('D' + cellIndex).value = totalPredictor;
          }
        }
        if (p2) {
          let p2MonthData: Array<IdbPredictorData> = p2Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
          });
          if (p2MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p2MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('E' + cellIndex).value = totalPredictor;
          }
        }
        if (p3) {
          let p3MonthData: Array<IdbPredictorData> = p3Data.filter(mData => {
            let date: Date = new Date(mData.date);
            return (date.getFullYear() == startYear + 1) && date.getMonth() == i;
          });
          if (p3MonthData.length != 0) {
            let totalPredictor: number = _.sumBy(p3MonthData, (pData: IdbPredictorData) => {
              return pData.amount
            });
            worksheet.getCell('F' + cellIndex).value = totalPredictor;
          }
        }
        cellIndex++;
      }
    }

    //hrs?
  }

}
