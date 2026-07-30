import { Component, QueryList, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { FacilityOverviewReportAdapter } from './facility-overview-report.adapter';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { FacilitySectionReportComponent } from 'src/app/shared/data-overview/facility-section-report/facility-section-report.component';

@Component({
  selector: 'app-facility-overview-report-results',
  templateUrl: './facility-overview-report-results.component.html',
  styleUrl: './facility-overview-report-results.component.css',
  standalone: false
})
export class FacilityOverviewReportResultsComponent {

  facilityReport: IdbFacilityReport;
  overviewReportSettings: DataOverviewFacilityReportSettings;
  facilityReportSub: Subscription;

  print: boolean;
  printSub: Subscription;

  facility: IdbFacility;
  calanderizedMeters: Array<CalanderizedMeter>;
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  facilityOverviewData: FacilityOverviewData;
  utilityUseAndCost: UtilityUseAndCost;
  worker: Worker;
  calculating: boolean | 'error' = true;

  @ViewChildren(FacilitySectionReportComponent) sectionReports !: QueryList<FacilitySectionReportComponent>;

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private customFuelDbService: CustomFuelDbService,
    private eGridService: EGridService,
    private accountDbService: AccountdbService,
    private dataEvaluationService: DataEvaluationService,
    private customGWPDbService: CustomGWPDbService,
    private facilityOverviewReportAdapter: FacilityOverviewReportAdapter,
    private exportReportPdfService: ExportReportPdfService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.overviewReportSettings = this.facilityReport.dataOverviewReportSettings;
      this.calculateFacilitiesSummary();
    });
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    this.calculating = true;
    this.facility = this.facilityDbService.getFacilityById(this.facilityReport.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facilityReport.facilityId);
    let customGWPs: Array<IdbCustomGWP> = this.customGWPDbService.accountCustomGWPs.getValue();
    if (this.overviewReportSettings.includeAllMeterData == false) {
      let includeGroupIds: Array<string> = [];
      this.overviewReportSettings.includedGroups.forEach(group => {
        if (group.include) {
          includeGroupIds.push(group.groupId);
        }
      });
      facilityMeters = facilityMeters.filter(meter => {
        return includeGroupIds.includes(meter.groupId);
      });
    };
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    this.dateRange = {
      startDate: new Date(this.overviewReportSettings.startYear, this.overviewReportSettings.startMonth, 1),
      endDate: new Date(this.overviewReportSettings.endYear, this.overviewReportSettings.endMonth, 1)
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityOverviewData = data.facilityOverviewData;
          this.utilityUseAndCost = data.utilityUseAndCost;
          this.calanderizedMeters = data.calanderizedMeters;
          this.calculating = false;
        } else {
          this.calculating = 'error';
        }
      };

      this.worker.postMessage({
        type: 'overview',
        dateRange: this.dateRange,
        facility: this.facility,
        energyIsSource: this.overviewReportSettings.energyIsSource,
        meters: facilityMeters,
        meterData: meterData,
        inOverview: false,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: customFuels,
        customGWPs: customGWPs,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      this.calanderizedMeters = getCalanderizedMeterData(facilityMeters, meterData, this.facility, false, { energyIsSource: this.overviewReportSettings.energyIsSource, neededUnits: undefined }, this.eGridService.co2Emissions, customFuels, [this.facility], account.assessmentReportVersion, customGWPs);
      this.facilityOverviewData = new FacilityOverviewData(this.calanderizedMeters, this.dateRange, this.facility);
      this.utilityUseAndCost = new UtilityUseAndCost(this.calanderizedMeters, this.dateRange);
      this.calculating = false;
    }
  }

  onExportPdf() {
    if (this.calculating !== false || !this.facilityReport) {
      return;
    }

    const document = this.facilityOverviewReportAdapter.buildDocument({
      facilityReport: this.facilityReport,
      facility: this.facility,
      facilityOverviewData: this.facilityOverviewData,
      utilityUseAndCost: this.utilityUseAndCost,
      dateRange: this.dateRange,
      chartImageProviders: this.getChartImageProviders()
    });

    this.exportReportPdfService.export(document, `${this.facilityReport.name} - Data Overview Report`);
  }

  getSectionsByType(type: 'energyUse' | 'cost' | 'water') {
    return this.sectionReports?.find(section => section.dataType == type);
  }

  async getImage(type: 'energyUse' | 'cost' | 'water', chartType: 'meterStackedLineChart' | 'meterBarChart' | 'annualBarChart' | 'monthlyUsageLineChart'): Promise<string> {
    const section = this.getSectionsByType(type);
    if (!section) {
      return '';
    }
    switch (chartType) {
      case 'meterStackedLineChart':
        return await section.getMeterStackedLineChartImage();
      case 'meterBarChart':
        return await section.getMeterBarChartImage();
      case 'annualBarChart':
        return await section.getAnnualBarChartImage();
      case 'monthlyUsageLineChart':
        return await section.getMonthlyUsageLineChartImage();
    }
  }

  getChartImageProviders() {
    const imageByType = (chartType: 'meterStackedLineChart' | 'meterBarChart' | 'annualBarChart' | 'monthlyUsageLineChart') => ({
      energyUse: async () => await this.getImage('energyUse', chartType),
      cost: async () => await this.getImage('cost', chartType),
      water: async () => await this.getImage('water', chartType)
    });
    return {
      meterStackedLineChart: imageByType('meterStackedLineChart'),
      meterBarChart: imageByType('meterBarChart'),
      annualBarChart: imageByType('annualBarChart'),
      monthlyUsageLineChart: imageByType('monthlyUsageLineChart')
    };
  }
}
