import { Injectable } from '@angular/core';
import { IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from './calanderization.service';
import * as _ from 'lodash';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { FacilityBarChartData, HeatMapData, PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import { ReportOptions } from 'src/app/models/overview-report';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
@Injectable({
  providedIn: 'root'
})
export class VisualizationService {

  constructor(private calanderizationService: CalanderizationService) { }

  getFacilityBarChartData(meters: Array<IdbUtilityMeter>, sumByMonth: boolean, removeIncompleteYears: boolean, inAccount: boolean, reportOptions?: ReportOptions): Array<FacilityBarChartData> {
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(meters, inAccount, true, reportOptions);

    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: string }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    let resultData: Array<FacilityBarChartData> = new Array();
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
        let totalMarketEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.marketEmissions;
          } else {
            return 0;
          }
        });
        let totalLocationEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.locationEmissions;
          } else {
            return 0;
          }
        });
        return {
          time: yearMonth.month + ', ' + yearMonth.year,
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          locationEmissions: totalLocationEmissions,
          marketEmissions: totalMarketEmissions,
          year: yearMonth.year,
          consumption: 0,
          fiscalYear: undefined
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

        let totalMarketEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.marketEmissions;
          } else {
            return 0;
          }
        });
        let totalLocationEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.locationEmissions;
          } else {
            return 0;
          }
        });
        return {
          time: String(yearMonth.year),
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          locationEmissions: totalLocationEmissions,
          marketEmissions: totalMarketEmissions,
          year: yearMonth.year,
          consumption: 0,
          fiscalYear: undefined
        }
      });
    }
    return resultData;
  }


  getFacilityDashboardBarChartData(calanderizedMeterData: Array<CalanderizedMeter>, sumByMonth: boolean, removeIncompleteYears: boolean): Array<FacilityBarChartData> {
    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: string }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    let resultData: Array<FacilityBarChartData> = new Array();
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
        let totalMarketEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return (meterData.marketEmissions - meterData.excessRECsEmissions);
          } else {
            return 0;
          }
        });
        let totalLocationEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.locationEmissions;
          } else {
            return 0;
          }
        });
        return {
          time: yearMonth.month + ', ' + yearMonth.year,
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          locationEmissions: totalLocationEmissions,
          marketEmissions: totalMarketEmissions,
          year: yearMonth.year,
          consumption: 0,
          fiscalYear: undefined
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

        let totalMarketEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return (meterData.marketEmissions - meterData.excessRECsEmissions);
          } else {
            return 0;
          }
        });
        let totalLocationEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.locationEmissions;
          } else {
            return 0;
          }
        });
        return {
          time: String(yearMonth.year),
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          locationEmissions: totalLocationEmissions,
          marketEmissions: totalMarketEmissions,
          year: yearMonth.year,
          consumption: 0,
          fiscalYear: undefined
        }
      });
    }
    resultData = _.orderBy(resultData, (data) => { return new Date(data.time) });
    return resultData;
  }





  getMeterHeatMapData(calanderizedMeterData: Array<CalanderizedMeter>, facilityName: string): HeatMapData {
    // console.log(calanderizedMeterData)
    let months: Array<string> = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    let yearMonths = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    // if (removeIncompleteYears) {
    yearMonths = _.uniqWith(yearMonths, (a, b) => {
      return (a.year == b.year && a.month == b.month)
    });
    //create array of the uniq months and years
    let years: Array<number> = yearMonths.map(data => { return data.year });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, ['asc', 'desc']);
    let resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number>, monthlyEmissions: Array<number> }> = new Array();
    years.forEach(year => {
      let yearData: { monthlyEnergy: Array<number>, monthlyCost: Array<number>, monthlyEmissions: Array<number> } = { monthlyEnergy: new Array(), monthlyCost: new Array(), monthlyEmissions: new Array() };
      months.forEach(month => {
        let totalCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyCost;
          } else {
            return 0;
          }
        });
        let totalEnergy: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        //TODO: Market vs location emissions if not removing heat map
        let totalEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return (meterData.marketEmissions - meterData.excessRECsEmissions);
          } else {
            return 0;
          }
        });
        yearData.monthlyCost.push(totalCost)
        yearData.monthlyEnergy.push(totalEnergy);
        yearData.monthlyEmissions.push(totalEmissions);
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
    meterDataOption: string,
    calanderizedMeters: Array<CalanderizedMeter>): Array<PlotDataItem> {

    let selectedMeters: Array<CalanderizedMeter> = new Array();
    let selectedGroups: Array<IdbUtilityMeterGroup> = new Array();
    // let calanderizedMeterData: Array<CalanderizedMeter>;
    let lastBillEntry: MonthlyData;
    let firstBillEntry: MonthlyData;
    let plotData: Array<PlotDataItem> = new Array();

    if (meterDataOption == 'meters') {
      meterOptions.forEach(meterOption => {
        if (meterOption.selected) {
          let cMeter: CalanderizedMeter = calanderizedMeters.find(cMeter => { return cMeter.meter.id == meterOption.meter.id });
          selectedMeters.push(cMeter);
        }
      });
      // calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false);
      lastBillEntry = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(selectedMeters);
      firstBillEntry = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(selectedMeters);
    } else {
      meterGroupOptions.forEach(groupOption => {
        if (groupOption.selected) {
          selectedGroups.push(groupOption.meterGroup);
        }
      })
      let combindedMonthlyData: Array<MonthlyData> = selectedGroups.flatMap(group => { return group.combinedMonthlyData });
      lastBillEntry = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(undefined, combindedMonthlyData);
      firstBillEntry = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(undefined, combindedMonthlyData);
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
      selectedMeters.forEach(calanderizedMeter => {
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
            if (predictorData) {
              predictorPlotData.values.push(predictorData.amount);
            }
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
        let endog: Array<number> = plotData[y].values.map(val => { return val });
        let exog: Array<Array<number>> = plotData[x].values.map(val => { return [1, val] });
        try {
          let model: JStatRegressionModel = jStat.models.ols(endog, exog);
          regressionTableData.push({
            optionOne: plotData[x].label,
            optionTwo: plotData[y].label,
            r2Value: model.R2,
            pValue: model.f.pvalue,
            jstatModel: model
          });
        } catch (err) {

        }
      }
    }
    return regressionTableData;
  }
}