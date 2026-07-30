import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataQualityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-facility-data-quality-report-setup',
  standalone: false,
  templateUrl: './facility-data-quality-report-setup.component.html',
  styleUrl: './facility-data-quality-report-setup.component.css',
})
export class FacilityDataQualityReportSetupComponent {

  facilityReportSub: Subscription;
  facilityReport: IdbFacilityReport;
  reportSettings: DataQualityReportSettings;
  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;
  calanderizedMetersSub: Subscription;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityPredictors: Array<IdbPredictor>;
  selectedMeters: Array<IdbUtilityMeter> = [];
  selectedPredictors: Array<IdbPredictor> = [];
  selectionMode: 'analysis' | 'manual' = 'analysis';
  selectedAnalysisItem: IdbAnalysisItem;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  filteredAnalysisItems: Array<IdbAnalysisItem>;

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private facilityReportDbService: FacilityReportsDbService,
    private calanderizationService: CalanderizationService,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.dataQualityReportSettings;
      this.facilityMeters = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facilityReport.facilityId);
      this.facilityPredictors = this.predictorDbService.getByFacilityId(this.facilityReport.facilityId);
      this.initializeSelections();
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
      this.initializeSelections();
      this.validateDataQualityReport();
    });

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(meters => {
      this.setYearOptions();
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  initializeSelections() {
    if (this.reportSettings.selectedMode) {
      this.selectionMode = this.reportSettings.selectedMode;
    }
    if (this.selectionMode === 'analysis' && this.reportSettings.selectedAnalysisItemId && this.analysisItems) {
      this.selectedAnalysisItem = this.analysisItems.find(item => item.guid === this.reportSettings.selectedAnalysisItemId);
    }
    else if (this.selectionMode === 'manual') {
      if (this.reportSettings.selectedMeterIds) {
        this.selectedMeters = this.facilityMeters.filter(meter => this.reportSettings.selectedMeterIds.includes(meter.guid));
      }
      if (this.reportSettings.selectedPredictorIds) {
        this.selectedPredictors = this.facilityPredictors.filter(predictor => this.reportSettings.selectedPredictorIds.includes(predictor.guid));
      }
    }
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', false, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  onSelectedAnalysisItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItem = item;
    this.reportSettings.selectedAnalysisItemId = item.guid;
    this.reportSettings.selectedMode = this.selectionMode;
    this.validateDataQualityReport();
  }

  onFilteredItemsChange(items: Array<IdbAnalysisItem>) {
    this.filteredAnalysisItems = items;
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    this.facilityReport.analysisItemId = this.selectedAnalysisItem ? this.selectedAnalysisItem.guid : undefined;
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }

  toggleMeter(meter: IdbUtilityMeter) {
    const idx = this.selectedMeters.indexOf(meter);
    if (idx > -1) {
      this.selectedMeters.splice(idx, 1);
    } else {
      this.selectedMeters.push(meter);
    }
    this.reportSettings.selectedMeterIds = this.selectedMeters.map(meter => meter.guid);
    this.reportSettings.selectedMode = this.selectionMode;
    this.validateDataQualityReport();
  }

  togglePredictor(predictor: IdbPredictor) {
    const idx = this.selectedPredictors.indexOf(predictor);
    if (idx > -1) {
      this.selectedPredictors.splice(idx, 1);
    } else {
      this.selectedPredictors.push(predictor);
    }
    this.reportSettings.selectedPredictorIds = this.selectedPredictors.map(predictor => predictor.guid);
    this.reportSettings.selectedMode = this.selectionMode;
    this.validateDataQualityReport();
  }

  onSelectionModeChange() {
    this.selectedMeters = [];
    this.selectedPredictors = [];
    this.selectedAnalysisItem = undefined;
    this.reportSettings.selectedMeterIds = [];
    this.reportSettings.selectedPredictorIds = [];
    this.reportSettings.selectedAnalysisItemId = undefined;
    this.reportSettings.selectedMode = this.selectionMode;
    this.validateDataQualityReport();
  }

  validateDataQualityReport() {
    if (this.selectionMode === 'analysis' && !this.selectedAnalysisItem) {
      this.reportSettings.missingSelection = true;
    }
    else if (this.selectionMode === 'manual' && this.selectedMeters.length === 0 && this.selectedPredictors.length === 0) {
      this.reportSettings.missingSelection = true;
    }
    else
      this.reportSettings.missingSelection = false;
    this.save();
  }

  onIncludeMeterChange() {
    const checked = this.reportSettings.includeMeter;
    this.reportSettings.includeMeterStatisticsTable = checked;
    this.reportSettings.includeMeterConsumptionTimeseriesGraph = checked;
    this.reportSettings.includeMeterCostTimeseriesGraph = checked;
    this.reportSettings.includeMeterConsumptionHistogram = checked;
    this.reportSettings.includeMeterCostHistogram = checked;
    this.save();
  }

  onMeterSubOptionChange() {
    this.reportSettings.includeMeter = (this.reportSettings.includeMeterStatisticsTable && this.reportSettings.includeMeterConsumptionTimeseriesGraph && this.reportSettings.includeMeterCostTimeseriesGraph && this.reportSettings.includeMeterConsumptionHistogram && this.reportSettings.includeMeterCostHistogram);
    this.save();
  }
  
  onIncludePredictorChange() {
    const checked = this.reportSettings.includePredictors;
    this.reportSettings.includePredictorStatisticsTable = checked;
    this.reportSettings.includePredictorTimeseriesGraph = checked;
    this.reportSettings.includePredictorHistogram = checked;
    this.save();
  }

  onPredictorSubOptionChange() {
    this.reportSettings.includePredictors = (this.reportSettings.includePredictorStatisticsTable && this.reportSettings.includePredictorTimeseriesGraph && this.reportSettings.includePredictorHistogram);
    this.save();
  }
}
