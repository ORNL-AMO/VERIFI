import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-regression-model-inspection',
    templateUrl: './regression-model-inspection.component.html',
    styleUrls: ['./regression-model-inspection.component.css'],
    standalone: false
})
export class RegressionModelInspectionComponent implements OnInit {
  @Input()
  model: JStatRegressionModel;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output('emitSelect')
  emitSelect: EventEmitter<boolean> = new EventEmitter<boolean>();

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;

  worker: Worker;
  calculating: boolean | 'error';
  inspectedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  selectedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  selectedFacility: IdbFacility;
  isSelectedModel: boolean;
  compareSelectedModel: boolean = false;
  analysisItem: IdbAnalysisItem;
  accountAnalysisItems: Array<IdbAnalysisItem>;
  accountPredictorEntries: Array<IdbPredictorData>;
  selectedGroup: AnalysisGroup;
  selectedModel: JStatRegressionModel;
  facilityMeters: Array<IdbUtilityMeter>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  account: IdbAccount;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private predictorDataDbService: PredictorDataDbService,
    private plotlyService: PlotlyService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedGroup = this.analysisService.selectedGroup.getValue();
    this.isSelectedModel = this.selectedGroup.selectedModelId == this.model.modelId;
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.accountAnalysisItems = this.analysisDbService.accountAnalysisItems.getValue();
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.accountPredictorEntries = this.predictorDataDbService.accountPredictorData.getValue();
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    this.facilityMeterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    this.calculateInspectedModel();
  }

  ngAfterViewInit(){
    this.drawChart();
  }

  calculateInspectedModel() {
    let groupCopy: AnalysisGroup = JSON.parse(JSON.stringify(this.selectedGroup));
    groupCopy.regressionConstant = this.model.coef[0];
    groupCopy.regressionModelYear = this.model.modelYear;
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.inspectedMonthlyAnalysisSummaryData = data.monthlyAnalysisSummary.monthlyAnalysisSummaryData;
          this.calculating = false;
          this.drawChart();
        } else {
          this.inspectedMonthlyAnalysisSummaryData = undefined;
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: groupCopy,
        analysisItem: this.analysisItem,
        facility: this.selectedFacility,
        meters: this.facilityMeters,
        meterData: this.facilityMeterData,
        accountPredictorEntries: this.accountPredictorEntries,
        accountAnalysisItems: this.accountAnalysisItems,
        assessmentReportVersion: this.account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(this.facilityMeters, this.facilityMeterData, this.selectedFacility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.selectedFacility], this.account.assessmentReportVersion);
      let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(groupCopy, this.analysisItem, this.selectedFacility, calanderizedMeters, this.accountPredictorEntries, false, this.accountAnalysisItems);
      this.inspectedMonthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData;
      this.calculating = false;
      this.drawChart();
    }
  }

  calculateSelectedModel() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.selectedMonthlyAnalysisSummaryData = data.monthlyAnalysisSummary.monthlyAnalysisSummaryData;
          this.calculating = false;
          this.drawChart();
        } else {
          this.selectedMonthlyAnalysisSummaryData = undefined;
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: this.selectedGroup,
        analysisItem: this.analysisItem,
        facility: this.selectedFacility,
        meters: this.facilityMeters,
        meterData: this.facilityMeterData,
        accountPredictorEntries: this.accountPredictorEntries,
        accountAnalysisItems: this.accountAnalysisItems,
        assessmentReportVersion: this.account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(this.facilityMeters, this.facilityMeterData, this.selectedFacility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.selectedFacility], this.account.assessmentReportVersion);
      let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(this.selectedGroup, this.analysisItem, this.selectedFacility, calanderizedMeters, this.accountPredictorEntries, false, this.accountAnalysisItems);
      this.selectedMonthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData;
      this.calculating = false;
      this.drawChart();
    }
  }



  drawChart() {
    console.log('draw')
    if (this.monthlyAnalysisGraph) {
      console.log('....')
      let name: string = this.getGraphName();

      let yAxisTitle: string = this.analysisItem.energyUnit;
      let traceColor: string = '#7D3C98'
      if (this.analysisItem.analysisCategory == 'water') {
        yAxisTitle = this.analysisItem.waterUnit;
        traceColor = '#3498DB';
      }

      var data = [];
      if (this.inspectedMonthlyAnalysisSummaryData) {
        var trace1 = {
          type: "scatter",
          mode: "lines+markers",
          name: name,
          x: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.modeledEnergy }),
          line: { color: '#BB8FCE', width: 4 },
          marker: {
            size: 8
          }
        }
        let potentialModelYearData: Array<MonthlyAnalysisSummaryData> = this.inspectedMonthlyAnalysisSummaryData.filter(data => {
          return data.fiscalYear == this.model.modelYear;
        });
        var trace2 = {
          type: "scatter",
          mode: "markers",
          name: 'Potential Model Year',
          x: potentialModelYearData.map(results => { return results.date }),
          y: potentialModelYearData.map(results => { return results.modeledEnergy }),
          line: { color: '#8E44AD', width: 4 },
          marker: {
            size: 16,
            symbol: 'star'
          }
        }


        var trace3 = {
          type: "scatter",
          mode: "markers",
          name: this.getTrace3Name(),
          x: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.energyUse }),
          line: { color: '#515A5A', width: 4 },
          marker: {
            size: 10,
            symbol: 'square'
          }
        }
        data = [trace3, trace1, trace2]
      }


      if (this.compareSelectedModel) {
        var trace4 = {
          type: "scatter",
          mode: "lines+markers",
          name: this.getTrace4Name(),
          x: this.selectedMonthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.selectedMonthlyAnalysisSummaryData.map(results => { return results.modeledEnergy }),
          line: { color: '#5DADE2', width: 4 },
          marker: {
            size: 8
          }
        }
        data.push(trace4);
        let modelYearData: Array<MonthlyAnalysisSummaryData> = this.selectedMonthlyAnalysisSummaryData.filter(data => {
          return data.fiscalYear == this.selectedGroup.regressionModelYear;
        });
        var trace5 = {
          type: "scatter",
          mode: "markers",
          name: 'Current Model Year',
          x: modelYearData.map(results => { return results.date }),
          y: modelYearData.map(results => { return results.modeledEnergy }),
          line: { color: '#2E86C1', width: 4 },
          marker: {
            size: 16,
            symbol: 'star'
          }
        }
        data.push(trace5);
      }


      var layout = {
        // height: 700,
        legend: {
          orientation: "h"
        },
        title: {
          text: this.getGraphTitle(),
          font: {
            size: 18
          },
        },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, data, layout, config);
    }
  }


  cancelInspectModel() {
    this.emitClose.emit(true);
  }

  setCompareSelected() {
    this.selectedModel = this.selectedGroup.models.find(model => { return model.modelId == this.selectedGroup.selectedModelId });
    this.compareSelectedModel = true;
    if (!this.selectedMonthlyAnalysisSummaryData) {
      this.calculateSelectedModel();
    } else {
      this.drawChart();
    }
  }

  hideCompareSelected() {
    this.selectedModel = undefined;
    this.compareSelectedModel = false;
    this.drawChart();
  }

  selectModel() {
    this.emitSelect.emit(true);
  }

  getGraphName(): string {
    if (this.analysisItem.analysisCategory == 'energy' && this.selectedMonthlyAnalysisSummaryData) {
      return 'Potential Modeled Energy';
    } else if (this.analysisItem.analysisCategory == 'energy') {
      return 'Modeled Energy';
    } else if (this.analysisItem.analysisCategory == 'water' && this.selectedMonthlyAnalysisSummaryData) {
      return 'Potential Modeled Water';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Modeled Water';
    }
    return '';
  }

  getTrace3Name(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Actual Energy';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Actual Consumption';
    }
  }

  getTrace4Name(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Current Modeled Energy';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Current Modeled Consumption';
    }
  }

  getGraphTitle(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Comparison of Actual and Modeled Energy Use';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Comparison of Actual and Modeled Water Consumption';
    }
  }
}
