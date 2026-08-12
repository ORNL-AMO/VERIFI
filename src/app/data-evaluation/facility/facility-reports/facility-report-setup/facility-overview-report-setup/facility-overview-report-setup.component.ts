import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
    selector: 'app-facility-overview-report-setup',
    templateUrl: './facility-overview-report-setup.component.html',
    styleUrl: './facility-overview-report-setup.component.css',
    standalone: false
})
export class FacilityOverviewReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
  private readonly calanderizationService = inject(CalanderizationService);

  readonly account = this.accountWorkspaceStore.account;

  facilityReport: IdbFacilityReport;
  reportSettings: DataOverviewFacilityReportSettings;
  readonly months: Array<Month> = Months;

  private readonly _facilityReport = signal<IdbFacilityReport>(undefined);

  readonly reportYears = computed(() => {
    const report = this._facilityReport();
    if (!report) return [];
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    return this.calanderizationService.getYearOptions('all', true, report.facilityId);
  });
  readonly baselineYears = this.reportYears;

  readonly invalidDateRange = computed(() => {
    const settings = this.reportSettings;
    if (!settings?.startYear || !settings?.endYear) return false;
    if (settings.startYear !== settings.endYear) return settings.startYear > settings.endYear;
    return settings.startMonth > settings.endMonth;
  });

  private isFormChange = false;

  constructor() {
    effect(() => {
      const report = this.accountWorkspaceStore.selectedFacilityReport();
      if (!this.isFormChange) {
        this.facilityReport = report;
        this.reportSettings = report?.dataOverviewReportSettings;
        this._facilityReport.set(report);
      } else {
        this.isFormChange = false;
      }
    });
  }

  async save() {
    this.isFormChange = true;
    this.facilityReport.dataOverviewReportSettings = this.reportSettings;
    const activeAccountGuid = this.account()?.guid;
    const { value: updatedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'update', entityGuid: this.facilityReport.guid, label: 'Save Report',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityReports', upsert: [value] }] }) }},
      () => this.reportHandler.updateFacilityReport(this.facilityReport, activeAccountGuid)
    );
    this.facilityReport = updatedReport;
    this._facilityReport.set(updatedReport);
    this.accountWorkspaceService.selectFacilityReport(updatedReport?.guid);
  }
}
