import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, ModelingReportSettings } from 'src/app/models/idbModels/facilityReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { FacilityReportsService } from '../../facility-reports.service';

@Component({
  selector: 'app-facility-modeling-report-setup',
  standalone: false,
  templateUrl: './facility-modeling-report-setup.component.html',
  styleUrl: './facility-modeling-report-setup.component.css',
})
export class FacilityModelingReportSetupComponent {
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;
  selectedAnalysisItem: IdbAnalysisItem;
  reportSettings: ModelingReportSettings;
  reportYears: Array<number>;
  errorMessage: string;
  errorMessageSub: Subscription;

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private facilityReportsService: FacilityReportsService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.modelingReportSettings;
    });

    this.setYearOptions();

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
    });
    this.setSelectedAnalysisItem(true);

    this.errorMessageSub = this.facilityReportsService.errorMessage.subscribe(message => {
      this.errorMessage = message;
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.errorMessageSub.unsubscribe();
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    if (!onInit) {
      await this.save();
    }
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }

  setYearOptions() {
    //TODO: include partial years for savings reports?
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', false, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
  }
}
