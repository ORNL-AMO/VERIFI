import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, QueryList, ViewChildren, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { CalanderizedMeter } from '@data/models/calanderization';
import { FacilityOverviewData } from '@domain/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from '@domain/calculations/dashboard-calculations/useAndCostClass';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { FacilityOverviewReportAdapter } from '@v0/data-evaluation/facility/facility-reports/report-results/facility-overview-report-results/facility-overview-report.adapter';
import { ExportReportPdfService } from '@v0/shared/pdf-report/services/export-report-pdf.service';
import { FacilitySectionReportComponent } from '@v0/shared/data-overview/facility-section-report/facility-section-report.component';
import { FacilityOverviewReportPptAdapter } from '@v0/data-evaluation/facility/facility-reports/report-results/facility-overview-report-results/facility-overview-report-ppt.adapter';
import { PptReportService } from '@v0/shared/ppt-report/ppt-report.service';
import { AccountOverviewService } from '@v0/data-evaluation/account/account-overview/account-overview.service';
import { FacilityOverviewService } from '@v0/data-evaluation/facility/facility-overview/facility-overview.service';

@Component({
  selector: 'app-facility-overview-report-results',
  templateUrl: './facility-overview-report-results.component.html',
  styleUrl: './facility-overview-report-results.component.css',
  standalone: false
})
export class FacilityOverviewReportResultsComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  account: IdbAccount;

  @ViewChildren(FacilitySectionReportComponent) sectionReports !: QueryList<FacilitySectionReportComponent>;

  constructor(
    private eGridService: EGridService,
    private dataEvaluationService: DataEvaluationService,
    private facilityOverviewReportAdapter: FacilityOverviewReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private pptReportService: PptReportService,
    private facilityOverviewReportPptAdapter: FacilityOverviewReportPptAdapter,
    private injector: Injector,
    private accountOverviewService: AccountOverviewService,
    private facilityOverviewService: FacilityOverviewService

  ) {

  }

  ngOnInit() {
    this.facility = this.accountWorkspaceStore.selectedFacility();
    this.account = this.accountWorkspaceStore.account();
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
      this.overviewReportSettings = this.facilityReport.dataOverviewReportSettings;
      this.calculateFacilitiesSummary();
    });
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    if (this.facility.guid) {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(display => {
        this.emissionsDisplay = display;
      });
    }
    else {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(display => {
        this.emissionsDisplay = display;
      });
    }
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  calculateFacilitiesSummary() {
    this.calculating = true;
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(this.facilityReport.facilityId);
    let customGWPs: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
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
    let meterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    let customFuels: Array<IdbCustomFuel> = [...this.accountWorkspaceStore.customFuels()];
    this.dateRange = {
      startDate: new Date(this.overviewReportSettings.startYear, this.overviewReportSettings.startMonth, 1),
      endDate: new Date(this.overviewReportSettings.endYear, this.overviewReportSettings.endMonth, 1)
    }
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../platform/web-workers/facility-overview.worker', import.meta.url));
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
      emissionsDisplay: this.emissionsDisplay,
      chartImageProviders: this.getChartImageProviders(),
      emissionsChartImageProviders: this.getEmissionsChartImageProviders()
    });

    this.exportReportPdfService.export(document, `${this.facilityReport.name} - Data Overview Report`);
  }

  getSectionsByType(type: 'energyUse' | 'cost' | 'water' | 'emissions') {
    return this.sectionReports?.find(section => section.dataType == type);
  }

  async getImage(type: 'energyUse' | 'cost' | 'water' | 'emissions', chartType: 'meterStackedLineChart' | 'meterBarChart' | 'annualBarChart' | 'monthlyUsageLineChart' | 'meterStackedLineChartEmissions' | 'emissionsBarChart' | 'annualBarChartEmissions' | 'monthlyUsageLineChartEmissions'): Promise<string> {
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
      case 'meterStackedLineChartEmissions':
        return await section.getMeterStackedLineChartEmissionsImage();
      case 'emissionsBarChart':
        return await section.getEmissionsBarChartImage();
      case 'annualBarChartEmissions':
        return await section.getAnnualBarChartEmissionsImage();
      case 'monthlyUsageLineChartEmissions':
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
      monthlyUsageLineChart: imageByType('monthlyUsageLineChart'),
    };
  }

  getEmissionsChartImageProviders() {
    return {
      meterStackedLineChartEmissions: async () => await this.getImage('emissions', 'meterStackedLineChartEmissions'),
      emissionsBarChart: async () => await this.getImage('emissions', 'emissionsBarChart'),
      annualBarChartEmissions: async () => await this.getImage('emissions', 'annualBarChartEmissions'),
      monthlyUsageLineChartEmissions: async () => await this.getImage('emissions', 'monthlyUsageLineChart')
    };
  }


  async downloadPpt(): Promise<void> {
    const document = this.facilityOverviewReportPptAdapter.buildDocument({
      report: this.facilityReport,
      facility: this.facility,
      facilityOverviewData: this.facilityOverviewData,
      utilityUseAndCost: this.utilityUseAndCost,
      dateRange: this.dateRange,
      emissionsDisplay: this.emissionsDisplay
    });
    await this.pptReportService.buildPowerpoint(document, `Data Overview Report - ${this.facilityReport.name}.pptx`);
  }
}
