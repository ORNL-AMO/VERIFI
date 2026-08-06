import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { Subscription } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { DataOverviewReportAdapter } from './data-overview-report.adapter';
import { DataOverviewAccountReportComponent } from './data-overview-account-report/data-overview-account-report.component';
import { DataOverviewFacilityReportComponent } from './data-overview-facility-report/data-overview-facility-report.component';
import { DataOverviewReportPptAdapter } from './data-overview-report-ppt.adapter';
import { PptReportService } from 'src/app/shared/ppt-report/ppt-report.service';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css'],
  standalone: false
})
export class DataOverviewReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  overviewReport: DataOverviewReportSetup;
  print: boolean = false;
  printSub: Subscription;
  account: IdbAccount;

  facilitiesWorker: any;
  facilitiesData: Array<DataOverviewFacility>;

  accountWorker: any;
  accountData: DataOverviewAccount;

  includedFacilities: Array<string>;
  includedGroups: Array<string>;
  facilityIndex: number;

  calculatingFacilities: boolean = true;
  calculatingAccounts: boolean = true;
  isExportingPdf: boolean = false;

  @ViewChild(DataOverviewAccountReportComponent) dataOverviewAccountReport: DataOverviewAccountReportComponent;
  @ViewChildren(DataOverviewFacilityReportComponent) dataOverviewFacilityReports!: QueryList<DataOverviewFacilityReportComponent>;

  constructor(
    private eGridService: EGridService,
    private dataEvaluationService: DataEvaluationService,
    private exportReportPdfService: ExportReportPdfService,
    private dataOverviewReportAdapter: DataOverviewReportAdapter,
    private dataOverviewReportPptAdapter: DataOverviewReportPptAdapter,
    private pptReportService: PptReportService
  ) {

  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.account = this.accountWorkspaceStore.account();
    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport();
    this.overviewReport = selectedReport.dataOverviewReportSetup;
    this.includedFacilities = new Array();
    this.includedGroups = new Array();
    this.overviewReport.includedFacilities.forEach(facility => {
      if (facility.included || this.overviewReport.includeAllMeterData) {
        this.includedFacilities.push(facility.facilityId);
        facility.includedGroups.forEach(group => {
          if (group.include) {
            this.includedGroups.push(group.groupId);
          }
        })
      }
    });
    if (this.overviewReport.includeAccountReport) {
      this.calculateAccountSummary(selectedReport);
    } else {
      this.calculatingAccounts = false;
    }

    if (this.overviewReport.includeFacilityReports) {
      this.facilitiesData = new Array();
      if (this.includedFacilities.length > 0) {
        let accountFacilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
        let startDate: Date = new Date(selectedReport.startYear, selectedReport.startMonth, 1);
        let endDate: Date = new Date(selectedReport.endYear, selectedReport.endMonth, 1);
        this.calculateFacilitiesSummary(0, accountFacilities, accountMeterGroups, startDate, endDate);
      } else {
        this.calculatingFacilities = false;
      }
    } else {
      this.calculatingFacilities = false;
    }
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  //recursively function to calculate all facilities one at a time
  calculateFacilitiesSummary(facilityIndex: number, accountFacilities: Array<IdbFacility>, accountMeterGroups: Array<IdbUtilityMeterGroup>, startDate: Date, endDate: Date) {
    let facilityId: string = this.includedFacilities[facilityIndex];
    let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == facilityId });
    let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facilityId });
    if (this.overviewReport.includeAllMeterData == false) {
      facilityMeters = facilityMeters.filter(meter => {
        return this.includedGroups.includes(meter.groupId);
      });
    };
    let meterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    let dataOverviewFacility: DataOverviewFacility = this.initDataOverviewFacility(facility, startDate, endDate);
    let customFuels: Array<IdbCustomFuel> = [...this.accountWorkspaceStore.customFuels()];
    let customGWPs: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
    if (typeof Worker !== 'undefined') {
      this.facilitiesWorker = new Worker(new URL('../../../../web-workers/facility-overview.worker', import.meta.url));
      this.facilitiesWorker.onmessage = ({ data }) => {
        if (!data.error) {
          dataOverviewFacility.facilityOverviewData = data.facilityOverviewData;
          dataOverviewFacility.utilityUseAndCost = data.utilityUseAndCost;
          dataOverviewFacility.calanderizedMeters = data.calanderizedMeters;
        } else {
          dataOverviewFacility.calculationError = true;
        }
        this.facilitiesWorker.terminate();
        this.facilitiesData.push(dataOverviewFacility);
        if (facilityIndex != this.includedFacilities.length - 1) {
          this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups, startDate, endDate);
        } else {
          this.calculatingFacilities = false;
        }
      };

      this.facilitiesWorker.postMessage({
        type: 'overview',
        dateRange: dataOverviewFacility.dateRange,
        facility: facility,
        energyIsSource: this.overviewReport.energyIsSource,
        meters: facilityMeters,
        meterData: meterData,
        inOverview: false,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: customFuels,
        assessmentReportVersion: this.account.assessmentReportVersion,
        customGWPs: customGWPs
      });



    } else {
      // Web Workers are not supported in this environment.
      dataOverviewFacility.calanderizedMeters = getCalanderizedMeterData(facilityMeters, meterData, this.account, false, { energyIsSource: this.overviewReport.energyIsSource, neededUnits: undefined }, this.eGridService.co2Emissions, customFuels, [facility], this.account.assessmentReportVersion, customGWPs);
      dataOverviewFacility.facilityOverviewData = new FacilityOverviewData(dataOverviewFacility.calanderizedMeters, dataOverviewFacility.dateRange, facility);
      dataOverviewFacility.utilityUseAndCost = new UtilityUseAndCost(dataOverviewFacility.calanderizedMeters, dataOverviewFacility.dateRange);
      this.facilitiesData.push(dataOverviewFacility);
      if (facilityIndex != this.includedFacilities.length - 1) {
        this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups, startDate, endDate);
      } else {
        this.calculatingFacilities = false;
      }
    }
  }

  calculateAccountSummary(selectedReport: IdbAccountReport) {
    let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let includedFacilities: Array<IdbFacility> = facilities.filter(facility => {
      return this.includedFacilities.includes(facility.guid);
    });

    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];

    let includedMeters: Array<IdbUtilityMeter>;
    if (this.overviewReport.includeAllMeterData) {
      includedMeters = meters;
    } else {
      includedMeters = meters.filter(meter => {
        return this.includedGroups.includes(meter.groupId);
      });
    }

    let meterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    let startDate: Date = new Date(selectedReport.startYear, selectedReport.startMonth, 1);
    let endDate: Date = new Date(selectedReport.endYear, selectedReport.endMonth, 1);
    let customFuels: Array<IdbCustomFuel> = [...this.accountWorkspaceStore.customFuels()];
    let customGWPs: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
    this.accountData = this.initDataOverviewAccount(this.account, startDate, endDate);

    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('../../../../web-workers/account-overview.worker', import.meta.url));
      this.accountWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.accountData.accountOverviewData = data.accountOverviewData;
          this.accountData.utilityUseAndCost = data.utilityUseAndCost;
          this.accountData.calanderizedMeters = data.calanderizedMeters
        } else {
          this.accountData.accountOverviewData = undefined;
          this.accountData.utilityUseAndCost = undefined;
          this.accountData.calculationError = true;
        }
        this.calculatingAccounts = false;
        this.accountWorker.terminate();
      };

      this.accountWorker.postMessage({
        facilities: includedFacilities,
        type: 'overview',
        dateRange: this.accountData.dateRange,
        meters: includedMeters,
        meterData: meterData,
        account: this.account,
        energyIsSource: this.overviewReport.energyIsSource,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: customFuels,
        customGWPs: customGWPs,
      });
    } else {
      // Web Workers are not supported in this environment.
      this.accountData.calanderizedMeters = getCalanderizedMeterData(meters, meterData, this.account, false, { energyIsSource: this.overviewReport.energyIsSource, neededUnits: undefined }, this.eGridService.co2Emissions, customFuels, includedFacilities, this.account.assessmentReportVersion, customGWPs);
      this.accountData.accountOverviewData = new AccountOverviewData(this.accountData.calanderizedMeters, facilities, this.account, this.accountData.dateRange);
      this.accountData.utilityUseAndCost = new UtilityUseAndCost(this.accountData.calanderizedMeters, this.accountData.dateRange);
      this.calculatingAccounts = false;
    }
  }



  initDataOverviewFacility(facility: IdbFacility, startDate: Date, endDate: Date): DataOverviewFacility {
    return {
      facility: facility,
      calanderizedMeters: undefined,
      dateRange: {
        startDate: startDate,
        endDate: endDate
      },
      facilityOverviewData: undefined,
      utilityUseAndCost: undefined,
      calculationError: false
    }
  }

  initDataOverviewAccount(account: IdbAccount, startDate: Date, endDate: Date): DataOverviewAccount {
    return {
      account: account,
      calanderizedMeters: undefined,
      dateRange: {
        startDate: startDate,
        endDate: endDate
      },
      accountOverviewData: undefined,
      utilityUseAndCost: undefined,
      calculationError: false
    }
  }

  async onExportPdf() {
    let selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!selectedReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.dataOverviewReportAdapter.buildDocument({
        account: this.account,
        report: selectedReport,
        overviewReport: this.overviewReport,
        accountData: this.accountData,
        facilitiesData: this.facilitiesData,
        chartImageProviders: this.getChartImageProviders(),
        facilityChartImageProviders: this.getFacilityChartImageProviders()
      });
      await this.exportReportPdfService.export(document, `${selectedReport.name} - Data Overview Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  getChartImageProviders() {
    return {
      utilityUsageMap: {
        energyUse: async () => this.dataOverviewAccountReport?.getChartImageProviders('map', 'energyUse') ?? '',
        cost: async () => this.dataOverviewAccountReport?.getChartImageProviders('map', 'cost') ?? '',
        water: async () => this.dataOverviewAccountReport?.getChartImageProviders('map', 'water') ?? '',
      },
      usageDonut: {
        energyUse: async () => this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'energyUse') ?? '',
        cost: async () => this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'cost') ?? '',
        water: async () => this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'water') ?? '',
      },
      utilityUsageDonut: {
        energyUse: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageDonut', 'energyUse') ?? '',
        cost: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageDonut', 'cost') ?? '',
        water: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageDonut', 'water') ?? '',
      },
      utilityUsageStackedBar: {
        energyUse: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageStackedBar', 'energyUse') ?? '',
        cost: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageStackedBar', 'cost') ?? '',
        water: async () => this.dataOverviewAccountReport?.getChartImageProviders('utilityUsageStackedBar', 'water') ?? '',
      },
      monthlyUsageLineChart: {
        energyUse: async () => this.dataOverviewAccountReport?.getChartImageProviders('monthlyUsageLineChart', 'energyUse') ?? '',
        cost: async () => this.dataOverviewAccountReport?.getChartImageProviders('monthlyUsageLineChart', 'cost') ?? '',
        water: async () => this.dataOverviewAccountReport?.getChartImageProviders('monthlyUsageLineChart', 'water') ?? '',
      }
    };
  }

  getFacilityChartImageProviders() {
    const map: Record<string, any> = {};
    const buildChartProviders = (facilityReport: DataOverviewFacilityReportComponent) => ({
      meterStackedLineChart: {
        energyUse: async () => facilityReport.getImage('energyUse', 'meterStackedLineChart'),
        cost: async () => facilityReport.getImage('cost', 'meterStackedLineChart'),
        water: async () => facilityReport.getImage('water', 'meterStackedLineChart')
      },
      meterBarChart: {
        energyUse: async () => facilityReport.getImage('energyUse', 'meterBarChart'),
        cost: async () => facilityReport.getImage('cost', 'meterBarChart'),
        water: async () => facilityReport.getImage('water', 'meterBarChart')
      },
      annualBarChart: {
        energyUse: async () => facilityReport.getImage('energyUse', 'annualBarChart'),
        cost: async () => facilityReport.getImage('cost', 'annualBarChart'),
        water: async () => facilityReport.getImage('water', 'annualBarChart')
      },
      monthlyUsageLineChart: {
        energyUse: async () => facilityReport.getImage('energyUse', 'monthlyUsageLineChart'),
        cost: async () => facilityReport.getImage('cost', 'monthlyUsageLineChart'),
        water: async () => facilityReport.getImage('water', 'monthlyUsageLineChart')
      }
    });

    this.dataOverviewFacilityReports.forEach(facilityReport => {
      const facilityId = facilityReport?.dataOverviewFacility?.facility?.guid;
      if (facilityId) {
        map[facilityId] = buildChartProviders(facilityReport);
      }
    });

    return map;
  }

  async downloadPpt(): Promise<void> {
    const selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!selectedReport) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    const usageDonutImages = {
      energyUse: await this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'energyUse') ?? '',
      cost: await this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'cost') ?? '',
      water: await this.dataOverviewAccountReport?.getChartImageProviders('usageDonut', 'water') ?? '',
    }
    const mapImages = {
      energyUse: await this.dataOverviewAccountReport?.getChartImageProviders('map', 'energyUse') ?? '',
      cost: await this.dataOverviewAccountReport?.getChartImageProviders('map', 'cost') ?? '',
      water: await this.dataOverviewAccountReport?.getChartImageProviders('map', 'water') ?? '',
    }
    const document = this.dataOverviewReportPptAdapter.buildDocument({
      account: this.account,
      report: selectedReport,
      reportSettings: this.overviewReport,
      accountData: this.accountData,
      facilitiesData: this.facilitiesData,
      usageDonutImages: usageDonutImages,
      mapImages: mapImages,
    });
    await this.pptReportService.buildPowerpoint(document, `Data Overview Report - ${selectedReport?.name}.pptx`);
  }
}

export interface DataOverviewFacility {
  facility: IdbFacility,
  calanderizedMeters: Array<CalanderizedMeter>;
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  facilityOverviewData: FacilityOverviewData;
  utilityUseAndCost: UtilityUseAndCost;
  calculationError: boolean
}

export interface DataOverviewAccount {
  account: IdbAccount;
  calanderizedMeters: Array<CalanderizedMeter>;
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  accountOverviewData: AccountOverviewData;
  utilityUseAndCost: UtilityUseAndCost;
  calculationError: boolean;
}
