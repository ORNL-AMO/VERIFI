import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountReportsService } from '../account-reports.service';
import { Subscription } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';

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
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountReportsService: AccountReportsService) {

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
    let dataOverviewFacility: DataOverviewFacility = this.initDataOverviewFacility(facility, startDate, endDate);

    dataOverviewFacility.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true, { energyIsSource: this.overviewReport.energyIsSource });
    if (typeof Worker !== 'undefined') {
      this.facilitiesWorker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.facilitiesWorker.onmessage = ({ data }) => {
        dataOverviewFacility.facilityOverviewData = data.facilityOverviewData;
        dataOverviewFacility.utilityUseAndCost = data.utilityUseAndCost;
        this.facilitiesWorker.terminate();
        this.facilitiesData.push(dataOverviewFacility);
        if (facilityIndex != this.includedFacilities.length - 1) {
          this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups, startDate, endDate);
        } else {
          this.calculatingFacilities = false;
        }
      };

      this.facilitiesWorker.postMessage({
        calanderizedMeters: dataOverviewFacility.calanderizedMeters,
        type: 'overview',
        dateRange: dataOverviewFacility.dateRange,
        facility: facility
      });



    } else {
      // Web Workers are not supported in this environment.
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

    let startDate: Date = new Date(selectedReport.startYear, selectedReport.startMonth, 1);
    let endDate: Date = new Date(selectedReport.endYear, selectedReport.endMonth, 1);


    this.accountData = this.initDataOverviewAccount(this.account, startDate, endDate);
    this.accountData.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(includedMeters, true, true, { energyIsSource: this.overviewReport.energyIsSource });

    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.accountWorker.onmessage = ({ data }) => {
        this.accountData.accountOverviewData = data.accountOverviewData;
        this.accountData.utilityUseAndCost = data.utilityUseAndCost;
        this.calculatingAccounts = false;
        this.accountWorker.terminate();
      };

      this.accountWorker.postMessage({
        calanderizedMeters: this.accountData.calanderizedMeters,
        facilities: includedFacilities,
        type: 'overview',
        dateRange: this.accountData.dateRange
      });
    } else {
      // Web Workers are not supported in this environment.
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
      utilityUseAndCost: undefined
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
      utilityUseAndCost: undefined
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
}