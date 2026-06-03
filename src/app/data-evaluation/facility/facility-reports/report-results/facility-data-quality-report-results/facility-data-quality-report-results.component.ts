import { Component, inject, QueryList, Signal, ViewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { DataQualityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
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

@Component({
  selector: 'app-facility-data-quality-report-results',
  standalone: false,
  templateUrl: './facility-data-quality-report-results.component.html',
  styleUrl: './facility-data-quality-report-results.component.css',
})
export class FacilityDataQualityReportResultsComponent {

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

  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  @ViewChildren('meterConsumption') meterConsumption !: QueryList<MeterEnergyTimeseriesGraphComponent>;
  @ViewChildren('meterCost') meterCost !: QueryList<MeterCostTimeseriesGraphComponent>;
  @ViewChildren('meterEnergyHistogram') meterEnergy !: QueryList<MeterEnergyHistogramComponent>;
  @ViewChildren('meterCostHistogram') meterCostHistogram !: QueryList<MeterCostHistogramComponent>;
  @ViewChildren('predictorTimeseries') predictorTimeseries !: QueryList<PredictorTimeseriesGraphComponent>;
  @ViewChildren('predictorHistogram') predictorHistogram !: QueryList<PredictorHistogramGraphComponent>;

  constructor(
    private facilityReportsDbService: FacilityReportsDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityDataQualityReportAdapter: FacilityDataQualityReportAdapter,
    private exportReportPdfService: ExportReportPdfService
  ) { }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
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
    if (this.selectedMode === 'analysis') {
      this.selectedAnalysisItemId = this.dataQualityReportSettings.selectedAnalysisItemId;
      const facilityCheck = this.facilityStatusCheck();
      const analysisStatusCheck = facilityCheck?.analysisStatusChecks.find(a => a.analysisItem.guid === this.selectedAnalysisItemId);
      if (analysisStatusCheck) {
        this.selectedMeterIds = analysisStatusCheck.includedMeterStatusChecks.map(m => m.meterId);
        this.selectedPredictorIds = analysisStatusCheck.includedPredictorStatusChecks.map(p => p.predictorId);
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
      let data = this.utilityMeterDataDbService.getMeterDataFromMeterId(meterId);
      let meter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      let { energyStats, costStats } = getStatistics(data, meter);
      let energyOutlierCount = energyStats.outliers;
      let costOutlierCount = costStats.outliers;
      let includeCosts = isNaN(costStats.average) == false && costStats.average != 0;
      let hasData = data.length > 0;
      let datesList = this.getDatesList(data);
      return { meter, data, energyStats, costStats, energyOutlierCount, costOutlierCount, includeCosts, hasData, datesList };
    });

    this.predictorDataStatsList = this.selectedPredictorIds.map(predictorId => {
      let data = this.predictorDataDbService.getByPredictorId(predictorId);
      let predictor = this.predictorDbService.getByGuid(predictorId);
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
