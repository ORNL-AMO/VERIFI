import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../account-reports.service';
import { Subscription } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizeMetersClass } from 'src/app/calculations/calanderization/calanderizeMeters';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css']
})
export class DataOverviewReportComponent {

  overviewReport: DataOverviewReportSetup;
  print: boolean = false;
  printSub: Subscription;
  account: IdbAccount;

  facilitiesWorker: any;
  facilitiesData: Array<DataOverviewFacility>;

  accountWorker: any;
  accountData: DataOverviewAccount;

  includedFacilities: Array<string>;
  facilityIndex: number;

  calculatingFacilities: boolean = true;
  calculatingAccounts: boolean = true;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountReportsService: AccountReportsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) {

  }

  ngOnInit() {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.overviewReport = selectedReport.dataOverviewReportSetup;
    this.includedFacilities = new Array();
    this.overviewReport.includedFacilities.forEach(facility => {
      if (facility.included) {
        this.includedFacilities.push(facility.facilityId);
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
        let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
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
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facilityId });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let dataOverviewFacility: DataOverviewFacility = this.initDataOverviewFacility(facility, startDate, endDate);

    if (typeof Worker !== 'undefined') {
      this.facilitiesWorker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
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
        inOverview: false
      });



    } else {
      // Web Workers are not supported in this environment.
      this.accountData.calanderizedMeters = new CalanderizeMetersClass(facilityMeters, meterData, this.account, false, { energyIsSource: this.overviewReport.energyIsSource }).calanderizedMeterData;
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
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let includedFacilities: Array<IdbFacility> = facilities.filter(facility => {
      return this.includedFacilities.includes(facility.guid);
    });

    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
      return this.includedFacilities.includes(meter.facilityId);
    });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let startDate: Date = new Date(selectedReport.startYear, selectedReport.startMonth, 1);
    let endDate: Date = new Date(selectedReport.endYear, selectedReport.endMonth, 1);


    this.accountData = this.initDataOverviewAccount(this.account, startDate, endDate);
    // this.accountData.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(includedMeters, true, true, { energyIsSource: this.overviewReport.energyIsSource });

    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
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
        energyIsSource: this.overviewReport.energyIsSource
      });
    } else {
      // Web Workers are not supported in this environment.
      this.accountData.calanderizedMeters = new CalanderizeMetersClass(meters, meterData, this.account, false, { energyIsSource: this.overviewReport.energyIsSource }).calanderizedMeterData;

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