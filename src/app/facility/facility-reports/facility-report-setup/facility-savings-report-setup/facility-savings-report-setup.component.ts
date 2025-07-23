import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, SavingsFacilityReportSettings } from 'src/app/models/idbModels/facilityReport';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { FacilityReportsService } from '../../facility-reports.service';
import { Month, Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-facility-savings-report-setup',
  standalone: false,

  templateUrl: './facility-savings-report-setup.component.html',
  styleUrl: './facility-savings-report-setup.component.css'
})
export class FacilitySavingsReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;
  selectedAnalysisItem: IdbAnalysisItem;
  energyColumnLabel: string;
  actualUseLabel: string;
  modeledUseLabel: string;
  isFormChange: boolean = false;
  reportSettings: SavingsFacilityReportSettings;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  errorMessage: string;
  errorMessageSub: Subscription;
  months: Array<Month> = Months;

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
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.savingsReportSettings;
      } else {
        this.isFormChange = false;
      }
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
    this.setLabels();
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

  setLabels() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.analysisCategory == 'water') {
        this.actualUseLabel = 'Actual Consumption';
      } else if (this.selectedAnalysisItem.analysisCategory == 'energy') {
        this.actualUseLabel = 'Actual Energy Use';
      }
    }
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsAccount('all', this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }
}
