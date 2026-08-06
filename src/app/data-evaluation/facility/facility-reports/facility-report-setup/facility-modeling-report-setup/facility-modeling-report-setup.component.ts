import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, ModelingReportSettings } from 'src/app/models/idbModels/facilityReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-facility-modeling-report-setup',
  standalone: false,
  templateUrl: './facility-modeling-report-setup.component.html',
  styleUrl: './facility-modeling-report-setup.component.css',
})
export class FacilityModelingReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;
  selectedAnalysisItem: IdbAnalysisItem;
  reportSettings: ModelingReportSettings;
  reportYears: Array<number>;

  calanderizedMetersSub: Subscription;
  filteredAnalysisItems: Array<IdbAnalysisItem>;
  baselineYears: Array<number>;
  constructor(
    private facilityReportsDbService: FacilityReportsDbService,
    private calanderizationService: CalanderizationService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport).subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.modelingReportSettings;
    });

    this.analysisItemsSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalyses).subscribe(items => {
      this.analysisItems = [...items];
    });
    this.setSelectedAnalysisItem();

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(meters => {
      this.setYearOptions();
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  async setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectFacilityReport((this.facilityReport)?.guid);
  }

  setYearOptions() {
    //TODO: include partial years for savings reports?
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', false, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  onSelectedAnalysisItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItem = item;
    this.save();
  }

  onFilteredItemsChange(items: Array<IdbAnalysisItem>) {
    this.filteredAnalysisItems = items;
  }
}
