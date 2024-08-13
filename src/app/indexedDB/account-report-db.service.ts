import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccountReport } from '../models/idbModels/accountReport';

@Injectable({
  providedIn: 'root'
})
export class AccountReportDbService {

  accountReports: BehaviorSubject<Array<IdbAccountReport>>;
  selectedReport: BehaviorSubject<IdbAccountReport>;
  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private loadingService: LoadingService) {
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

  async getAllAccountReports(accountId: string): Promise<Array<IdbAccountReport>> {
    let allReports: Array<IdbAccountReport> = await firstValueFrom(this.getAll())
    let accountReports: Array<IdbAccountReport> = allReports.filter(report => { return report.accountId == accountId });
    return accountReports;

  }

  getById(id: number): Observable<IdbAccountReport> {
    return this.dbService.getByKey('accountReports', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAccountReport> {
    return this.dbService.getByIndex('accountReports', indexName, indexValue);
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
    values.modifiedDate = new Date();
    return this.dbService.update('accountReports', values);
  }

  async updateReportsRemoveFacility(facilityId: string) {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    for (let i = 0; i < accountReports.length; i++) {
      let report: IdbAccountReport = accountReports[i];
      report.dataOverviewReportSetup.includedFacilities = report.dataOverviewReportSetup.includedFacilities.filter(facility => { return facility.facilityId != facilityId });
      if (report.betterClimateReportSetup && report.betterClimateReportSetup.includedFacilityGroups) {
        report.betterClimateReportSetup.includedFacilityGroups = report.betterClimateReportSetup.includedFacilityGroups.filter(facility => { return facility.facilityId != facilityId });
      }
      this.loadingService.setLoadingMessage('Removing Facility From Reports (' + i + '/' + accountReports.length + ')...');
      await firstValueFrom(this.updateWithObservable(report));
    }
  }

  async updateReportsRemoveGroup(groupId: string) {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    for (let i = 0; i < accountReports.length; i++) {
      let report: IdbAccountReport = accountReports[i];
      if (report.betterClimateReportSetup.includedFacilityGroups) {
        for (let facilityIndex: number = 0; facilityIndex < report.betterClimateReportSetup.includedFacilityGroups.length; facilityIndex++) {
          report.betterClimateReportSetup.includedFacilityGroups[facilityIndex].groups = report.betterClimateReportSetup.includedFacilityGroups[facilityIndex].groups.filter(group => { return group.groupId != groupId });
        }

      }
      this.loadingService.setLoadingMessage('Removing Group From Reports (' + i + '/' + accountReports.length + ')...');
      await firstValueFrom(this.updateWithObservable(report));
    }
  }

  async deleteAccountReports() {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    await this.deleteReports(accountReports);
  }

  async deleteReports(accountReports: Array<IdbAccountReport>) {
    for (let i = 0; i < accountReports.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Reports (' + i + '/' + accountReports.length + ')...');
      await this.deleteWithObservable(accountReports[i].id);
    }
  }

  getHasCorrespondingReport(analysisId: string): boolean {
    let accountReports: Array<IdbAccountReport> = this.accountReports.getValue();
    let hasReport: IdbAccountReport = accountReports.find(report => {
      return (report.reportType == 'betterPlants' && report.betterPlantsReportSetup.analysisItemId == analysisId);
    });
    return (hasReport != undefined);
  }

}
