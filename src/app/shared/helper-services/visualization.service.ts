import { Injectable } from '@angular/core';
import { IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from './calanderization.service';
import * as _ from 'lodash';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { HeatMapData, PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import * as regression from 'regression';
@Injectable({
  providedIn: 'root'
})
export class VisualizationService {

  constructor(private calanderizationService: CalanderizationService) { }

  getFacilityBarChartData(meters: Array<IdbUtilityMeter>, sumByMonth: boolean, removeIncompleteYears: boolean, inAccount: boolean): Array<{ time: string, energyUse: number, energyCost: number }> {
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(meters, inAccount, true);

    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: string }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    let resultData: Array<{ time: string, energyUse: number, energyCost: number }> = new Array();
    //iterate array of uniq months and years and sum energy/cost
    if (sumByMonth) {
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year && a.month == b.month)
      });
      resultData = yearMonths.map(yearMonth => {
        let totalEnergyUse: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergyCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyCost;
          } else {
            return 0;
          }
        });
        return {
          time: yearMonth.month + ', ' + yearMonth.year,
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost
        }

      });
    } else {
      if (removeIncompleteYears) {
        yearMonths = _.uniqWith(yearMonths, (a, b) => {
          return (a.year == b.year && a.month == b.month)
        });
        //remove data without 12 months for the year
        let counts = _.countBy(yearMonths, 'year');
        yearMonths = yearMonths.filter(yearMonthItem => { return counts[yearMonthItem.year] == 12 })
      }
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year)
      });
      resultData = yearMonths.map(yearMonth => {
        let totalEnergyUse: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == yearMonth.year) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergyCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == yearMonth.year) {
            return meterData.energyCost;
          } else {
            return 0;
          }
        });
        return {
          time: String(yearMonth.year),
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost
        }
      });
    }
    return resultData;
  }

  getMeterHeatMapData(meters: Array<IdbUtilityMeter>, facilityName: string, inAccount: boolean): HeatMapData {
    let months: Array<string> = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(meters, inAccount, false);
    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    let yearMonths = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    // if (removeIncompleteYears) {
    yearMonths = _.uniqWith(yearMonths, (a, b) => {
      return (a.year == b.year && a.month == b.month)
    });
    //remove data without 12 months for the year
    // let counts = _.countBy(yearMonths, 'year');
    // yearMonths = yearMonths.filter(yearMonthItem => { return counts[yearMonthItem.year] == 12 })
    // }
    //create array of the uniq months and years
    let years: Array<number> = yearMonths.map(data => { return data.year });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, ['asc', 'desc']);
    let resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }> = new Array();
    years.forEach(year => {
      let yearData: { monthlyEnergy: Array<number>, monthlyCost: Array<number> } = { monthlyEnergy: new Array(), monthlyCost: new Array() };
      months.forEach(month => {
        let totalCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyCost;
          } else {
            return undefined;
          }
        });
        let totalEnergy: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyUse;
          } else {
            return undefined;
          }
        });
        yearData.monthlyCost.push(totalCost)
        yearData.monthlyEnergy.push(totalEnergy);
      });
      resultData.push(yearData);
    });
    return {
      months: months,
      years: years,
      resultData: resultData,
      facilityName: facilityName
    }
  }


  getPlotData(
    predictorOptions: Array<{ predictor: PredictorData, selected: boolean }>,
    meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }>,
    facilityPredictorEntries: Array<IdbPredictorEntry>,
    dateRange: { minDate: Date, maxDate: Date },
    meterGroupOptions: Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }>,
    meterDataOption: string): Array<PlotDataItem> {

    let facilityMeters: Array<IdbUtilityMeter> = new Array();
    let selectedGroups: Array<IdbUtilityMeterGroup> = new Array();
    let calanderizedMeterData: Array<CalanderizedMeter>;
    let lastBillEntry: MonthlyData;
    let firstBillEntry: MonthlyData;
    let plotData: Array<PlotDataItem> = new Array();

    if (meterDataOption == 'meters') {
      meterOptions.forEach(meterOption => {
        if (meterOption.selected) {
          facilityMeters.push(meterOption.meter);
        }
      });
      calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false);
      lastBillEntry = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
      firstBillEntry = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    } else {
      meterGroupOptions.forEach(groupOption => {
        if (groupOption.selected) {
          selectedGroups.push(groupOption.meterGroup);
        }
      })
      let combindedMonthlyData: Array<MonthlyData> = selectedGroups.flatMap(group => { return group.combinedMonthlyData });
      lastBillEntry = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData, combindedMonthlyData);
      firstBillEntry = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData, combindedMonthlyData);
    }

    let lastPredictorEntry: IdbPredictorEntry = _.maxBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date: Date = new Date(data.date);
      return date;
    });

    let firstPredictorEntry: IdbPredictorEntry = _.minBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date: Date = new Date(data.date);
      return date;
    });


    let endDate: Date = this.getLastDate(lastBillEntry, lastPredictorEntry);
    if (dateRange && dateRange.maxDate) {
      let maxDate: Date = new Date(dateRange.maxDate);
      maxDate.setMonth(maxDate.getMonth() + 1);
      endDate = _.min([endDate, maxDate]);
    }

    if (meterDataOption == 'meters') {
      calanderizedMeterData.forEach(calanderizedMeter => {
        let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
        if (dateRange && dateRange.minDate) {
          startDate = _.max([startDate, new Date(dateRange.minDate)]);
        }

        let meterPlotData: PlotDataItem = {
          label: calanderizedMeter.meter.name,
          values: new Array(),
          valueDates: new Array(),
          isMeter: true
        }
        if (startDate && endDate) {
          while (startDate < endDate) {
            meterPlotData.valueDates.push(new Date(startDate));
            let meterData: MonthlyData = calanderizedMeter.monthlyData.find(dataItem => {
              return (dataItem.monthNumValue == startDate.getUTCMonth() && dataItem.year == startDate.getUTCFullYear());
            });
            if (meterData) {
              meterPlotData.values.push(meterData.energyUse);
            } else {
              meterPlotData.values.push(0);
            }
            startDate.setMonth(startDate.getMonth() + 1)
          };
          plotData.push(meterPlotData);
        }
      });
    } else {
      selectedGroups.forEach(group => {
        let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
        if (dateRange && dateRange.minDate) {
          startDate = _.max([startDate, new Date(dateRange.minDate)]);
        }
        let meterPlotData: PlotDataItem = {
          label: group.name,
          values: new Array(),
          valueDates: new Array(),
          isMeter: true
        }
        if (startDate && endDate) {
          while (startDate < endDate) {
            meterPlotData.valueDates.push(new Date(startDate));
            let meterData: MonthlyData = group.combinedMonthlyData.find(dataItem => {
              return (dataItem.monthNumValue == startDate.getUTCMonth() && dataItem.year == startDate.getUTCFullYear());
            });
            if (meterData) {
              meterPlotData.values.push(meterData.energyUse);
            } else {
              meterPlotData.values.push(0);
            }
            startDate.setMonth(startDate.getMonth() + 1)
          };
          plotData.push(meterPlotData);
        }
      });
    }

    let facilityPredictors: Array<PredictorData> = new Array();
    predictorOptions.forEach(predictorOption => {
      if (predictorOption.selected) {
        facilityPredictors.push(predictorOption.predictor);
      }
    })
    facilityPredictors.forEach(predictor => {
      let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
      if (dateRange && dateRange.minDate) {
        startDate = _.max([startDate, new Date(dateRange.minDate)]);
      }
      let predictorPlotData: PlotDataItem = {
        label: predictor.name,
        values: new Array(),
        valueDates: new Array(),
        isMeter: false
      }
      if (startDate && endDate) {
        while (startDate < endDate) {
          predictorPlotData.valueDates.push(new Date(startDate));
          let facilityPredictor: IdbPredictorEntry = facilityPredictorEntries.find(dataItem => {
            let dataItemDate: Date = new Date(dataItem.date);
            return (dataItemDate.getUTCMonth() == startDate.getUTCMonth() && dataItemDate.getUTCFullYear() == startDate.getUTCFullYear());
          });
          if (facilityPredictor) {
            let predictorData: PredictorData = facilityPredictor.predictors.find(predictorEntry => { return predictorEntry.id == predictor.id });
            predictorPlotData.values.push(predictorData.amount);
          } else {
            predictorPlotData.values.push(0);
          }
          startDate.setMonth(startDate.getMonth() + 1)
        };
        plotData.push(predictorPlotData);
      }
    });
    return plotData;
  }


  getLastDate(monthlyData?: MonthlyData, predictorEntry?: IdbPredictorEntry): Date {
    let lastDate: Date;
    if (monthlyData && predictorEntry) {
      lastDate = _.max([new Date(monthlyData.date), new Date(predictorEntry.date)]);
    } else if (monthlyData) {
      lastDate = new Date(monthlyData.date);
    } else if (predictorEntry) {
      lastDate = new Date(predictorEntry.date);
    }
    return lastDate;
  }

  getRegressionTableData(plotData: Array<{ label: string, values: Array<number> }>): Array<RegressionTableDataItem> {
    let regressionTableData = new Array<RegressionTableDataItem>();
    for (let x = 0; x < plotData.length; x++) {
      for (let y = (x + 1); y < plotData.length; y++) {
        let regressionDataPairs: Array<Array<number>> = plotData[x].values.map((value, index) => { return [value, plotData[y].values[index]] });
        let regressionResult = regression.linear(regressionDataPairs);
        //TODO: Calculate P Value
        regressionTableData.push({
          optionOne: plotData[x].label,
          optionTwo: plotData[y].label,
          r2Value: regressionResult.r2,
          regressionResult: regressionResult,
          pValue: 0
        });
      }
    }
    return regressionTableData;
  }
}