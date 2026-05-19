import { Component, computed, ElementRef, inject, Signal, ViewChild, effect, signal, WritableSignal, untracked, afterRenderEffect } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnalysisService } from '../../../../analysis.service';
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
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-regression-user-defined-model-inspection',
  standalone: false,

  templateUrl: './regression-user-defined-model-inspection.component.html',
  styleUrl: './regression-user-defined-model-inspection.component.css'
})
export class RegressionUserDefinedModelInspectionComponent {
  private analysisService: AnalysisService = inject(AnalysisService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private plotlyService: PlotlyService = inject(PlotlyService);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private regressionsModelsService: RegressionModelsService = inject(RegressionModelsService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);


  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  accountAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.accountAnalysisItems);
  accountPredictorEntries: Signal<Array<IdbPredictorData>> = toSignal(this.predictorDataDbService.accountPredictorData);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.facilityMeters);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });

  private worker: Worker;
  calculating: WritableSignal<boolean | 'error'> = signal(false);
  inspectedMonthlyAnalysisSummaryData: WritableSignal<Array<MonthlyAnalysisSummaryData> | undefined> = signal(undefined);

  userModel: Signal<JStatRegressionModel> = computed(() => {
    const analysisItem = this.analysisItem();
    const selectedGroup = this.selectedGroup();
    const selectedFacility = this.selectedFacility();
    const calanderizedMeters = this.calanderizedMeters();

    if(!analysisItem || !selectedGroup || !selectedFacility || calanderizedMeters.length == 0) {
      return null;
    }
    let analysisItemCopy: IdbAnalysisItem = JSON.parse(JSON.stringify(analysisItem));
    analysisItemCopy.baselineYear = selectedGroup.regressionStartYear;
    let reportYear: number = getLatestYearWithData(calanderizedMeters, [selectedFacility]);
    return this.regressionsModelsService.getUserDefinedModel(selectedGroup, selectedFacility, analysisItemCopy, reportYear);
  });

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;

  constructor() {
    effect(() => {
      const analysisItem = this.analysisItem();
      const selectedGroup = this.selectedGroup();
      const selectedFacility = this.selectedFacility();
      const facilityMeters = this.facilityMeters();
      const facilityMeterData = this.facilityMeterData();
      const accountPredictorEntries = this.accountPredictorEntries();
      const accountAnalysisItems = this.accountAnalysisItems();
      const account = this.account();

      if (!analysisItem || !selectedGroup || !selectedFacility || !facilityMeters || !facilityMeterData || !account) {
        return;
      }

      untracked(() => this.calculateInspectedModel(
        analysisItem, selectedGroup, selectedFacility,
        facilityMeters, facilityMeterData,
        accountPredictorEntries, accountAnalysisItems, account
      ));
    });

    afterRenderEffect(() => this.drawChart());
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
  }

  calculateInspectedModel(
    analysisItem: IdbAnalysisItem,
    selectedGroup: AnalysisGroup,
    selectedFacility: IdbFacility,
    facilityMeters: Array<IdbUtilityMeter>,
    facilityMeterData: Array<IdbUtilityMeterData>,
    accountPredictorEntries: Array<IdbPredictorData>,
    accountAnalysisItems: Array<IdbAnalysisItem>,
    account: IdbAccount
  ): void {
    this.worker?.terminate();

    const analysisItemCopy: IdbAnalysisItem = JSON.parse(JSON.stringify(analysisItem));
    analysisItemCopy.baselineYear = selectedGroup.regressionStartYear;
    const groupCopy: AnalysisGroup = JSON.parse(JSON.stringify(selectedGroup));

    this.calculating.set(true);

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../../web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.inspectedMonthlyAnalysisSummaryData.set(data.monthlyAnalysisSummary.monthlyAnalysisSummaryData);
          this.calculating.set(false);
        } else {
          this.inspectedMonthlyAnalysisSummaryData.set(undefined);
          this.calculating.set('error');
        }
        this.worker.terminate();
      };
      this.worker.postMessage({
        selectedGroup: groupCopy,
        analysisItem: analysisItemCopy,
        facility: selectedFacility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries,
        accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(
        facilityMeters, facilityMeterData, selectedFacility, false,
        { energyIsSource: analysisItemCopy.energyIsSource, neededUnits: getNeededUnits(analysisItemCopy) },
        [], [], [selectedFacility], account.assessmentReportVersion, []
      );
      const monthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(
        groupCopy, analysisItemCopy, selectedFacility, calanderizedMeters,
        accountPredictorEntries, false, accountAnalysisItems
      );
      this.inspectedMonthlyAnalysisSummaryData.set(monthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData);
      this.calculating.set(false);
    }
  }

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      const analysisItem = this.analysisItem();
      const selectedGroup = this.selectedGroup();
      const summaryData = this.inspectedMonthlyAnalysisSummaryData();

      if (!analysisItem || !selectedGroup) {
        return;
      }

      let yAxisTitle: string = analysisItem.energyUnit;
      if (analysisItem.analysisCategory == 'water') {
        yAxisTitle = analysisItem.waterUnit;
      }

      var data = [];
      if (summaryData) {
        var trace1 = {
          type: "scatter",
          mode: "lines+markers",
          name: this.getGraphName(),
          x: summaryData.map(results => { return results.date }),
          y: summaryData.map(results => { return results.modeledEnergy }),
          line: { color: '#BB8FCE', width: 4 },
          marker: {
            size: 8
          }
        }

        const startMonth = selectedGroup.regressionModelStartMonth;
        const startYear = selectedGroup.regressionStartYear;
        const endMonth = selectedGroup.regressionModelEndMonth;
        const endYear = selectedGroup.regressionEndYear;

        const potentialModelYearData = summaryData.filter(data => {
          const date = data.date;
          return (
            (date.getFullYear() > startYear || (date.getFullYear() == startYear && date.getMonth() >= startMonth)) &&
            (date.getFullYear() < endYear || (date.getFullYear() == endYear && date.getMonth() <= endMonth))
          );
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
          x: summaryData.map(results => { return results.date }),
          y: summaryData.map(results => { return results.energyUse }),
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
    if (this.analysisItem()?.analysisCategory == 'energy') {
      return 'Modeled Energy';
    } else if (this.analysisItem()?.analysisCategory == 'water') {
      return 'Modeled Water';
    }
    return '';
  }

  getTrace3Name(): string {
    if (this.analysisItem()?.analysisCategory == 'energy') {
      return 'Actual Energy';
    } else if (this.analysisItem()?.analysisCategory == 'water') {
      return 'Actual Consumption';
    }
  }

  getGraphTitle(): string {
    if (this.analysisItem()?.analysisCategory == 'energy') {
      return 'Comparison of Actual and Modeled Energy Use';
    } else if (this.analysisItem()?.analysisCategory == 'water') {
      return 'Comparison of Actual and Modeled Water Consumption';
    }
  }

}
