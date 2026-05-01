import { Component, ElementRef, ViewChild } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnalysisService } from '../../../../analysis.service';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { MonthlyAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-regression-user-defined-model-inspection',
  standalone: false,

  templateUrl: './regression-user-defined-model-inspection.component.html',
  styleUrl: './regression-user-defined-model-inspection.component.css'
})
export class RegressionUserDefinedModelInspectionComponent {

  selectedGroup: AnalysisGroup;
  selectedGroupSub: Subscription;
  analysisItem: IdbAnalysisItem;
  worker: Worker;
  calculating: boolean | 'error';
  inspectedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  selectedFacility: IdbFacility;
  accountAnalysisItems: Array<IdbAnalysisItem>;
  accountPredictorEntries: Array<IdbPredictorData>;
  userModel: JStatRegressionModel;
  facilityMeters: Array<IdbUtilityMeter>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  account: IdbAccount;
  analysisItemCopy: IdbAnalysisItem;

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;


  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private predictorDataDbService: PredictorDataDbService,
    private plotlyService: PlotlyService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountDbService: AccountdbService,
    private regressionsModelsService: RegressionModelsService,
    private loadingService: LoadingService,
    private calanderizationService: CalanderizationService
  ) { }

  ngOnInit(): void {
    this.loadingService.setLoadingMessage("Generating User Defined Model...");
    this.loadingService.setLoadingStatus(true);
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.accountAnalysisItems = this.analysisDbService.accountAnalysisItems.getValue();
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.accountPredictorEntries = this.predictorDataDbService.accountPredictorData.getValue();
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    this.facilityMeterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();

    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.selectedGroup = group;
      this.generateUserDefinedModel();
    });

    this.calculateInspectedModel();
  }

  ngOnDestroy(): void {
    this.selectedGroupSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  generateUserDefinedModel() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.analysisItemCopy = JSON.parse(JSON.stringify(analysisItem));
    this.analysisItemCopy.baselineYear = this.selectedGroup.regressionStartYear;
    //report year is determined by the latest full year of data
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByGroupId(this.selectedGroup.idbGroupId);
    let reportYear: number = getLatestYearWithData(calanderizedMeters, [this.selectedFacility]);
    this.userModel = this.regressionsModelsService.getUserDefinedModel(this.selectedGroup, this.selectedFacility, this.analysisItemCopy, reportYear);
  }

  calculateInspectedModel() {
    this.loadingService.setLoadingStatus(true);
    let groupCopy: AnalysisGroup = JSON.parse(JSON.stringify(this.selectedGroup));
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../../web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.inspectedMonthlyAnalysisSummaryData = data.monthlyAnalysisSummary.monthlyAnalysisSummaryData;
          this.calculating = false;
          this.loadingService.setLoadingStatus(false);
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
        analysisItem: this.analysisItemCopy,
        facility: this.selectedFacility,
        meters: this.facilityMeters,
        meterData: this.facilityMeterData,
        accountPredictorEntries: this.accountPredictorEntries,
        accountAnalysisItems: this.accountAnalysisItems,
        assessmentReportVersion: this.account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(this.facilityMeters, this.facilityMeterData, this.selectedFacility, false, { energyIsSource: this.analysisItemCopy.energyIsSource, neededUnits: getNeededUnits(this.analysisItemCopy) }, [], [], [this.selectedFacility], this.account.assessmentReportVersion, []);
      let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(groupCopy, this.analysisItemCopy, this.selectedFacility, calanderizedMeters, this.accountPredictorEntries, false, this.accountAnalysisItems);
      this.inspectedMonthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData;
      this.calculating = false;
      this.loadingService.setLoadingStatus(false);
      this.drawChart();
    }
  }

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      let name: string = this.getGraphName();

      let yAxisTitle: string = this.analysisItemCopy.energyUnit;
      let traceColor: string = '#7D3C98'
      if (this.analysisItemCopy.analysisCategory == 'water') {
        yAxisTitle = this.analysisItemCopy.waterUnit;
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

        const startMonth = this.selectedGroup.regressionModelStartMonth;;
        const startYear = this.selectedGroup.regressionStartYear;
        const endMonth = this.selectedGroup.regressionModelEndMonth;
        const endYear = this.selectedGroup.regressionEndYear;

        let potentialModelYearData: Array<MonthlyAnalysisSummaryData> = [];
        if (this.inspectedMonthlyAnalysisSummaryData) {
          potentialModelYearData = this.inspectedMonthlyAnalysisSummaryData.filter(data => {
            const date = data.date;
            return (
              (date.getFullYear() > startYear || (date.getFullYear() == startYear && date.getMonth() >= startMonth)) &&
              (date.getFullYear() < endYear || (date.getFullYear() == endYear && date.getMonth() <= endMonth))
            );
          });
        }

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
      var config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, data, layout, config);
    }
  }

  getGraphName(): string {
    if (this.analysisItemCopy.analysisCategory == 'energy') {
      return 'Modeled Energy';
    } else if (this.analysisItemCopy.analysisCategory == 'water') {
      return 'Modeled Water';
    }
    return '';
  }

  getTrace3Name(): string {
    if (this.analysisItemCopy.analysisCategory == 'energy') {
      return 'Actual Energy';
    } else if (this.analysisItemCopy.analysisCategory == 'water') {
      return 'Actual Consumption';
    }
  }

  getGraphTitle(): string {
    if (this.analysisItemCopy.analysisCategory == 'energy') {
      return 'Comparison of Actual and Modeled Energy Use';
    } else if (this.analysisItemCopy.analysisCategory == 'water') {
      return 'Comparison of Actual and Modeled Water Consumption';
    }
  }

}
