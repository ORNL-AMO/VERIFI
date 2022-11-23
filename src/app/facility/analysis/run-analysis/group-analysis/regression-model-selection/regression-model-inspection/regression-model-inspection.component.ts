import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { JStatRegressionModel, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';

@Component({
  selector: 'app-regression-model-inspection',
  templateUrl: './regression-model-inspection.component.html',
  styleUrls: ['./regression-model-inspection.component.css']
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
  calculating: boolean;
  inspectedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  selectedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  selectedFacility: IdbFacility;
  isSelectedModel: boolean;
  compareSelectedModel: boolean = false;
  analysisItem: IdbAnalysisItem;
  calanderizedMeters: Array<CalanderizedMeter>;
  accountPredictorEntries: Array<IdbPredictorEntry>;
  selectedGroup: AnalysisGroup;
  selectedModel: JStatRegressionModel;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.selectedGroup = this.analysisService.selectedGroup.getValue();
    this.isSelectedModel = this.selectedGroup.selectedModelId == this.model.modelId;
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.calanderizedMeters = this.analysisService.calanderizedMeters;
    this.accountPredictorEntries = this.predictorDbService.accountPredictorEntries.getValue();
    this.calculateInspectedModel();
  }

  calculateInspectedModel() {
    let groupCopy: AnalysisGroup = JSON.parse(JSON.stringify(this.selectedGroup));
    groupCopy.regressionConstant = this.model.coef[0];
    groupCopy.regressionModelYear = this.model.modelYear;
    groupCopy.predictorVariables.forEach(variable => {
      let coefIndex: number = this.model.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
      if (coefIndex != -1) {
        variable.regressionCoefficient = this.model.coef[coefIndex + 1];
      } else {
        variable.regressionCoefficient = 0;
      }
    });
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.inspectedMonthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
        this.calculating = false;
        this.drawChart();
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: groupCopy,
        analysisItem: this.analysisItem,
        facility: this.selectedFacility,
        calanderizedMeters: this.calanderizedMeters,
        accountPredictorEntries: this.accountPredictorEntries
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  calculateSelectedModel() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.selectedMonthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
        this.calculating = false;
        this.drawChart();
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: this.selectedGroup,
        analysisItem: this.analysisItem,
        facility: this.selectedFacility,
        calanderizedMeters: this.calanderizedMeters,
        accountPredictorEntries: this.accountPredictorEntries
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }



  drawChart() {
    if (this.monthlyAnalysisGraph) {
      let name: string = 'Modeled Energy';
      if(this.selectedMonthlyAnalysisSummaryData){
        name = 'Potential Modeled Energy';
      }

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
        name: 'Actual Energy',
        x: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.inspectedMonthlyAnalysisSummaryData.map(results => { return results.energyUse }),
        line: { color: '#515A5A', width: 4 },
        marker: {
          size: 10,
          symbol: 'square'
        }
      }

      var data = [trace3, trace1, trace2 ];

      if (this.compareSelectedModel) {
        var trace4 = {
          type: "scatter",
          mode: "lines+markers",
          name: 'Current Modeled Energy',
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
          text: 'Comparison of Actual and Modeled Energy Use',
          font: {
            size: 18
          },
        },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: this.analysisItem.energyUnit,
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
    this.selectedModel = this.selectedGroup.models.find(model => {return model.modelId == this.selectedGroup.selectedModelId});
    this.compareSelectedModel = true;
    if(!this.selectedMonthlyAnalysisSummaryData){
      this.calculateSelectedModel();
    }else{
      this.drawChart();
    }
  }

  hideCompareSelected(){
    this.selectedModel = undefined;
    this.compareSelectedModel = false;
    this.drawChart();
  }

  selectModel(){
    this.emitSelect.emit(true);
  }
}
