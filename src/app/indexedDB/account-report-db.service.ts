import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbAccountReport, IdbFacility } from '../models/idb';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';

@Injectable({
  providedIn: 'root'
})
export class AccountReportDbService {

  accountReports: BehaviorSubject<Array<IdbAccountReport>>;
  selectedReport: BehaviorSubject<IdbAccountReport>;
  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService) {
    this.accountReports = new BehaviorSubject<Array<IdbAccountReport>>([]);
    this.selectedReport = new BehaviorSubject<IdbAccountReport>(undefined);
    //subscribe after initialization
    this.selectedReport.subscribe(analysisItem => {
      if (analysisItem) {
        this.localStorageService.store('accountReportId', analysisItem.id);
      }
    });
  }

  getInitialReport(): number {
    let reportId: number = this.localStorageService.retrieve("accountReportId");
    return reportId;
  }

  getAll(): Observable<Array<IdbAccountReport>> {
    return this.dbService.getAll('accountReports');
  }

  getById(id: number): Observable<IdbAccountReport> {
    return this.dbService.getByKey('accountReports', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAccountReport> {
    return this.dbService.getByIndex('accountReports', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbAccountReport>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('accountReports', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('accountReports');
  }

  addWithObservable(analysisItem: IdbAccountReport): Observable<IdbAccountReport> {
    return this.dbService.add('accountReports', analysisItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('accountReports', id);
  }

  updateWithObservable(values: IdbAccountReport): Observable<IdbAccountReport> {
    values.date = new Date();
    return this.dbService.update('accountReports', values);
  }

  getNewAccountReport(account?: IdbAccount): IdbAccountReport {
    if (!account) {
      account = this.accountDbService.selectedAccount.getValue();
    }
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    return {
      accountId: account.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      name: 'Account Report',
      reportType: undefined,
      reportYear: undefined,
      baselineYear: undefined,
      startYear: undefined,
      startMonth: undefined,
      endYear: undefined,
      endMonth: undefined,
      betterPlantsReportSetup: {
        analysisItemId: undefined,
        includeFacilityNames: true,
        modificationNotes: undefined,
        baselineAdjustmentNotes: undefined,
      },
      dataOverviewReportSetup: {
        energyIsSource: account.energyIsSource,
        emissionsDisplay: 'location',
        includeMap: true,
        includeFacilityTable: true,
        includeFacilityDonut: true,
        includeUtilityTable: true,
        includeStackedBarChart: true,
        includeMonthlyLineChart: true,
        includeCostsSection: true,
        includeEmissionsSection: true,
        includeEnergySection: true,
        includeWaterSection: true,
        includedFacilities: facilities.map(facility => {
          return {
            facilityId: facility.guid,
            included: true
          }
        }),
        includeAccountReport: true,
        includeFacilityReports: true,
        includeMeterUsageStackedLineChart: true,
        includeMeterUsageTable: true,
        includeMeterUsageDonut: true,
        includeUtilityTableForFacility: true,
        includeAnnualBarChart: true,
        includeMonthlyLineChartForFacility: true
      }
    }
  }

  async updateReportsRemoveFacility(facilityId: string) {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    for (let i = 0; i < accountReports.length; i++) {
      let report: IdbAccountReport = accountReports[i];
      report.dataOverviewReportSetup.includedFacilities = report.dataOverviewReportSetup.includedFacilities.filter(facility => { return facility.facilityId != facilityId });
      await this.updateWithObservable(report).toPromise();
    }
  }


  async deleteAccountReports() {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    await this.deleteReports(accountReports);
  }

  async deleteReports(accountReports: Array<IdbAccountReport>) {
    for (let i = 0; i < accountReports.length; i++) {
      await this.deleteWithObservable(accountReports[i].id);
    }
  }

}