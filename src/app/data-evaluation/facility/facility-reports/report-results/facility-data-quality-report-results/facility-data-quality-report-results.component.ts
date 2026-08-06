import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { DataQualityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';
import { getStatistics, Statistics } from 'src/app/shared/shared-data-quality-report-meters/meterDataQualityStatistics';
import { getPredictorStatistics, PredictorStatistics } from 'src/app/shared/shared-data-quality-report-predictor/predictorDataQualityStatistics';
import { FacilityDataQualityReportAdapter } from './facility-data-quality-report.adapter';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { MeterEnergyTimeseriesGraphComponent } from 'src/app/shared/shared-data-quality-report-meters/meter-energy-timeseries-graph/meter-energy-timeseries-graph.component';
import { MeterCostTimeseriesGraphComponent } from 'src/app/shared/shared-data-quality-report-meters/meter-cost-timeseries-graph/meter-cost-timeseries-graph.component';
import { MeterEnergyHistogramComponent } from 'src/app/shared/shared-data-quality-report-meters/meter-energy-histogram/meter-energy-histogram.component';
import { MeterCostHistogramComponent } from 'src/app/shared/shared-data-quality-report-meters/meter-cost-histogram/meter-cost-histogram.component';
import { PredictorTimeseriesGraphComponent } from 'src/app/shared/shared-data-quality-report-predictor/predictor-timeseries-graph/predictor-timeseries-graph.component';
import { PredictorHistogramGraphComponent } from 'src/app/shared/shared-data-quality-report-predictor/predictor-histogram-graph/predictor-histogram-graph.component';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

@Component({
  selector: 'app-facility-data-quality-report-results',
  standalone: false,
  templateUrl: './facility-data-quality-report-results.component.html',
  styleUrl: './facility-data-quality-report-results.component.css',
})
export class FacilityDataQualityReportResultsComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  selectedMode: 'analysis' | 'manual';
  selectedAnalysisItemId: string;
  selectedMeterIds: Array<string>;
  selectedPredictorIds: Array<string>;
  dataQualityReportSettings: DataQualityReportSettings;
  analysisItem: IdbAnalysisItem;

  meterDataStatsList: Array<MeterDataStats> = [];
  predictorDataStatsList: Array<PredictorDataStats> = [];

  @ViewChildren('meterConsumption') meterConsumption !: QueryList<MeterEnergyTimeseriesGraphComponent>;
  @ViewChildren('meterCost') meterCost !: QueryList<MeterCostTimeseriesGraphComponent>;
  @ViewChildren('meterEnergyHistogram') meterEnergy !: QueryList<MeterEnergyHistogramComponent>;
  @ViewChildren('meterCostHistogram') meterCostHistogram !: QueryList<MeterCostHistogramComponent>;
  @ViewChildren('predictorTimeseries') predictorTimeseries !: QueryList<PredictorTimeseriesGraphComponent>;
  @ViewChildren('predictorHistogram') predictorHistogram !: QueryList<PredictorHistogramGraphComponent>;

  constructor(
    private facilityDataQualityReportAdapter: FacilityDataQualityReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private analysisDbService: AnalysisDbService

  ) { }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport).subscribe(report => {
      this.facilityReport = report;
      this.dataQualityReportSettings = this.facilityReport.dataQualityReportSettings;
      this.selectedMode = this.dataQualityReportSettings.selectedMode;
      this.setMetersAndPredictors();
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
  }

  setMetersAndPredictors() {
    this.selectedMeterIds = [];
    this.selectedPredictorIds = [];

    if (this.selectedMode === 'analysis') {
      this.selectedAnalysisItemId = this.dataQualityReportSettings.selectedAnalysisItemId;
      this.analysisItem = this.analysisDbService.getByGuid(this.selectedAnalysisItemId);
      if (this.analysisItem) {
        const meterIds = new Set<string>();
        const predictorIds = new Set<string>();

        this.analysisItem.groups.forEach(group => {
          if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') {
            return;
          }

          const groupMeters = this.accountWorkspaceQuery.getGroupMetersByGroupId(group.idbGroupId);
          groupMeters.forEach(meter => {
            if (meter.guid) {
              meterIds.add(meter.guid);
            }
          });

          if (group.analysisType === 'energyIntensity' || group.analysisType === 'modifiedEnergyIntensity') {
            group.predictorVariables.forEach(predictorVariable => {
              if (predictorVariable.id && predictorVariable.productionInAnalysis) {
                predictorIds.add(predictorVariable.id);
              }
            });
          }

          if (group.analysisType === 'regression') {
            if (group.isGeneratedModel) {
              const selectedModel = group.models?.find(model => model.modelId === group.selectedModelId);
              selectedModel?.predictorVariables.forEach(predictorVariable => {
                if (predictorVariable.id && predictorVariable.productionInAnalysis) {
                  predictorIds.add(predictorVariable.id);
                }
              });
            }
            else {
              group.predictorVariables.forEach(predictorVariable => {
                if (predictorVariable.id && predictorVariable.productionInAnalysis) {
                  predictorIds.add(predictorVariable.id);
                }
              });
            }
          }
        });
        this.selectedMeterIds = Array.from(meterIds);
        this.selectedPredictorIds = Array.from(predictorIds);
      }
    } else if (this.selectedMode === 'manual') {
      this.selectedMeterIds = this.dataQualityReportSettings.selectedMeterIds;
      this.selectedPredictorIds = this.dataQualityReportSettings.selectedPredictorIds;
    }
    if (this.selectedMeterIds || this.selectedPredictorIds) {
      this.createMetersandPredictorsList();
    }
  }

  createMetersandPredictorsList() {
    this.meterDataStatsList = this.selectedMeterIds.map(meterId => {
      let data = this.accountWorkspaceQuery.getMeterData(meterId);
      let meter = this.accountWorkspaceQuery.getMeterByGuid(meterId);
      let { energyStats, costStats } = getStatistics(data, meter);
      let energyOutlierCount = energyStats.outliers;
      let costOutlierCount = costStats.outliers;
      let includeCosts = isNaN(costStats.average) == false && costStats.average != 0;
      let hasData = data.length > 0;
      let datesList = this.getDatesList(data);
      return { meter, data, energyStats, costStats, energyOutlierCount, costOutlierCount, includeCosts, hasData, datesList };
    });

    this.predictorDataStatsList = this.selectedPredictorIds.map(predictorId => {
      let data = this.accountWorkspaceQuery.getPredictorData(predictorId);
      let predictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
      let stats = getPredictorStatistics(data.map(d => d.amount));
      let statusCheck = new PredictorStatusCheck(predictor, data, undefined);
      let missingMonthsList = statusCheck.missingEntryMonths.map(({ month, year }) => {
        const label = new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
        return { monthYear: label, month, year };
      });
      return { predictor, data, stats, missingMonthsList };
    });
  }

  getDatesList(meterData: Array<IdbUtilityMeterData>) {
    let dateCount: { [key: string]: number } = {};
    meterData.forEach(data => {
      let date = getDateFromMeterData(data);
      let month = date.toLocaleString('default', { month: 'short' });
      let year = date.getFullYear();
      let monthYear = `${month}, ${year}`;
      if (dateCount[monthYear]) {
        dateCount[monthYear]++;
      } else {
        dateCount[monthYear] = 1;
      }
    });
    return Object.keys(dateCount)
      .filter(key => dateCount[key] > 1)
      .map(key => ({ monthYear: key }));
  }

  onExportPdf() {
    const document = this.facilityDataQualityReportAdapter.buildDocument({
      facilityReport: this.facilityReport,
      meterDataStatsList: this.meterDataStatsList,
      predictorDataStatsList: this.predictorDataStatsList,
      chartImageProviders: this.getChartImageProviders()
    });
    this.exportReportPdfService.export(document, `${this.facilityReport.name} - Data Quality Report`);
  }

  getChartImageProviders() {
    const meterConsumptionMap: Record<string, () => Promise<string>> = {};
    const meterCostMap: Record<string, () => Promise<string>> = {};
    const meterEnergyHistogramMap: Record<string, () => Promise<string>> = {};
    const meterCostHistogramMap: Record<string, () => Promise<string>> = {};
    const predictorTimeseriesMap: Record<string, () => Promise<string>> = {};
    const predictorHistogramMap: Record<string, () => Promise<string>> = {};

    this.meterDataStatsList.forEach(stats => {
      const meterId = stats.meter.guid;
      meterConsumptionMap[meterId] = async () => {
        const chartComponent = this.meterConsumption.find(m => m.selectedMeter?.guid === stats.meter.guid);
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }

        return '';
      };

      meterCostMap[meterId] = async () => {
        const chartComponent = this.meterCost.find(m => m.meterData?.some(d => d.meterId === stats.meter.guid));
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }

        return '';
      };

      meterEnergyHistogramMap[meterId] = async () => {
        const chartComponent = this.meterEnergy.find(m => m.selectedMeter?.guid === stats.meter.guid);
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }
        return '';
      };

      meterCostHistogramMap[meterId] = async () => {
        const chartComponent = this.meterCostHistogram.find(m => m.meterData?.some(d => d.meterId === stats.meter.guid));
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }
        return '';
      };
    });

    this.predictorDataStatsList.forEach(stats => {
      const predictorId = stats.predictor.guid;

      predictorTimeseriesMap[predictorId] = async () => {
        const chartComponent = this.predictorTimeseries.find(m => m.selectedPredictor?.guid === stats.predictor.guid);
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }
        return '';
      };

      predictorHistogramMap[predictorId] = async () => {
        const chartComponent = this.predictorHistogram.find(m => m.selectedPredictor?.guid === stats.predictor.guid);
        if (chartComponent) {
          const base64Str = await chartComponent.getChartAsBase64Image();
          return base64Str;
        }
        return '';
      };
    });

    return {
      meterConsumptionTimeseries: meterConsumptionMap,
      meterCostTimeseries: meterCostMap,
      meterEnergyHistogram: meterEnergyHistogramMap,
      meterCostHistogram: meterCostHistogramMap,
      predictorTimeseries: predictorTimeseriesMap,
      predictorHistogram: predictorHistogramMap
    };
  }
}

export interface MeterDataStats {
  meter: IdbUtilityMeter;
  data: Array<IdbUtilityMeterData>;
  energyStats: Statistics;
  costStats: Statistics;
  energyOutlierCount: number;
  costOutlierCount: number;
  includeCosts: boolean;
  hasData: boolean;
  datesList: Array<{ monthYear: string }>;
}

export interface PredictorDataStats {
  predictor: IdbPredictor;
  data: Array<IdbPredictorData>;
  stats: PredictorStatistics;
  missingMonthsList: Array<{ monthYear: string, month: number, year: number }>;
}
