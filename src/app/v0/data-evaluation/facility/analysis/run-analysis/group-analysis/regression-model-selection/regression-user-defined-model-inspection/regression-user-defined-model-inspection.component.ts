import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, DestroyRef, ElementRef, inject, Signal, ViewChild, signal, WritableSignal, untracked, afterRenderEffect } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { getLatestCompleteAnalysisYear } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';
import { isEqual } from 'lodash';
import { inspectionCalculationInputs, isCompleteUserDefinedGroup, runUserDefinedInspection, UserDefinedInspectionRequest, UserDefinedInspectionResponse } from './user-defined-inspection-calculation';

@Component({
  selector: 'app-regression-user-defined-model-inspection',
  standalone: false,

  templateUrl: './regression-user-defined-model-inspection.component.html',
  styleUrl: './regression-user-defined-model-inspection.component.css'
})
export class RegressionUserDefinedModelInspectionComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private analysisService: AnalysisService = inject(AnalysisService);
  private plotlyService: PlotlyService = inject(PlotlyService);
  private regressionsModelsService: RegressionModelsService = inject(RegressionModelsService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryAttempt = signal(0);


  private readonly requestedGroup = toSignal(this.analysisService.selectedGroup);
  readonly selectedGroup = computed(() => this.analysisItem()?.groups.find(group => group.idbGroupId === this.requestedGroup()?.idbGroupId));
  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  accountAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.facilityAnalyses()]);
  accountPredictorEntries: Signal<Array<IdbPredictorData>> = computed(() => [...this.accountWorkspaceStore.predictorData()]);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.facilityMeters()]);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.facilityMeterData()]);
  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });

  private readonly calendarizationState = toSignal(this.calanderizationService.calendarizationState);
  private readonly calendarizationReady = computed(() => this.calanderizationService.isReadyForCurrentWorkspace(this.calendarizationState()));

  calculating: WritableSignal<boolean | 'error'> = signal(false);
  inspectedMonthlyAnalysisSummaryData: WritableSignal<Array<MonthlyAnalysisSummaryData> | undefined> = signal(undefined);

  userModel: Signal<JStatRegressionModel> = computed(() => {
    const input = this.calculationInput();
    const calanderizedMeters = this.calanderizedMeters();
    if (!input || !this.calendarizationReady() || !calanderizedMeters.length) return null;
    const { selectedGroup, analysisItem, facility, accountPredictorEntries } = input.request;
    const reportYear = getLatestCompleteAnalysisYear([selectedGroup], calanderizedMeters, accountPredictorEntries, [facility]);
    return this.regressionsModelsService.getUserDefinedModel(selectedGroup, facility, structuredClone(analysisItem), reportYear);
  });

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;

  private readonly calculationInput = computed(() => {
    const attempt = this.retryAttempt();
    const analysisItem = this.analysisItem();
    const selectedGroup = this.selectedGroup();
    const facility = this.selectedFacility();
    const account = this.account();
    if (!this.accountWorkspaceStore.isReady() || !analysisItem || !selectedGroup || !facility || !account
      || analysisItem.accountId !== account.guid || analysisItem.facilityId !== facility.guid
      || !isCompleteUserDefinedGroup(selectedGroup)) return undefined;
    const request: UserDefinedInspectionRequest = structuredClone({
      selectedGroup,
      analysisItem,
      facility,
      meters: this.facilityMeters(),
      meterData: this.facilityMeterData(),
      accountPredictorEntries: this.accountPredictorEntries(),
      accountAnalysisItems: this.accountAnalysisItems(),
      assessmentReportVersion: account.assessmentReportVersion
    });
    return { request, inputs: inspectionCalculationInputs(request), attempt };
  }, { equal: (first, second) => first?.attempt === second?.attempt && isEqual(first?.inputs, second?.inputs) });

  constructor() {
    toObservable(this.calculationInput).pipe(
      switchMap(input => {
        this.inspectedMonthlyAnalysisSummaryData.set(undefined);
        this.calculating.set(!!input);
        if (!input) return EMPTY;
        return runUserDefinedInspection(input.request).pipe(
          catchError(() => of<UserDefinedInspectionResponse>({ error: true })),
          map(response => ({ input, response }))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ input, response }) => {
      const current = this.calculationInput();
      if (!current || input.attempt !== current.attempt || !isEqual(input.inputs, current.inputs)) return;
      if (response.error || !response.monthlyAnalysisSummary?.monthlyAnalysisSummaryData) {
        this.inspectedMonthlyAnalysisSummaryData.set(undefined);
        this.calculating.set('error');
        return;
      }
      this.inspectedMonthlyAnalysisSummaryData.set(response.monthlyAnalysisSummary.monthlyAnalysisSummaryData);
      this.calculating.set(false);
    });
    afterRenderEffect(() => {
      this.chartInput();
      untracked(() => this.drawChart());
    });
  }

  retry(): void {
    this.retryAttempt.update(attempt => attempt + 1);
  }

  private readonly chartInput = computed(() => {
    const analysis = this.analysisItem();
    const group = this.selectedGroup();
    return {
      summary: this.inspectedMonthlyAnalysisSummaryData(),
      category: analysis?.analysisCategory,
      units: analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit,
      startYear: group?.regressionStartYear, startMonth: group?.regressionModelStartMonth,
      endYear: group?.regressionEndYear, endMonth: group?.regressionModelEndMonth
    };
  }, { equal: isEqual });

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      const analysisItem = this.analysisItem();
      const selectedGroup = this.selectedGroup();
      const summaryData = this.inspectedMonthlyAnalysisSummaryData();

      if (!analysisItem || !selectedGroup) {
        this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, [], {}, {});
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
