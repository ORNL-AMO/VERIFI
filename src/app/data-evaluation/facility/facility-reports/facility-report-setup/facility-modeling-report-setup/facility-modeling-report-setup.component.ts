import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { distinctUntilChanged, startWith, Subscription } from 'rxjs';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
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
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
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
    private calanderizationService: CalanderizationService,
    private injector: Injector
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector })
      .pipe(
        startWith(this.accountWorkspaceStore.selectedFacilityReport()),
        distinctUntilChanged()
      )
      .subscribe(report => {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport?.modelingReportSettings;
      });

    this.analysisItemsSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalyses, { injector: this.injector })
      .pipe(
        startWith(this.accountWorkspaceStore.selectedFacilityAnalyses()),
        distinctUntilChanged()
      )
      .subscribe(items => {
        this.analysisItems = [...items];
      });
    this.setSelectedAnalysisItem();

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(() => {
      this.setYearOptions();
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  setSelectedAnalysisItem() {
    if (!this.analysisItems || !this.facilityReport) {
      return;
    }
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
  }

  async save() {
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const { value: updatedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'update', entityGuid: this.facilityReport.guid, label: 'Save Report' },
      () => this.reportHandler.updateFacilityReport(this.facilityReport, activeAccountGuid)
    );
    this.facilityReport = updatedReport;
    this.accountWorkspaceService.selectFacilityReport(this.facilityReport?.guid);
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
