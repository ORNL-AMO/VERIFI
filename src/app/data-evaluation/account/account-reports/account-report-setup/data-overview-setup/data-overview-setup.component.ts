import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, computed, effect, inject } from '@angular/core';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
    selector: 'app-data-overview-setup',
    templateUrl: './data-overview-setup.component.html',
    styleUrls: ['./data-overview-setup.component.css'],
    standalone: false
})
export class DataOverviewSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);

  readonly account = this.accountWorkspaceStore.account;

  // overviewForm: FormGroup;
  reportSetup: DataOverviewReportSetup;

  readonly showWater = computed(() => {
    const meters = this.accountWorkspaceStore.meters();
    return meters.some(meter => meter.source === 'Water Intake' || meter.source === 'Water Discharge');
  });

  private isFormChange = false;

  constructor() {
    effect(() => {
      const report = this.accountWorkspaceStore.selectedAccountReport();
      const hasWater = this.showWater();
      if (!this.isFormChange) {
        this.reportSetup = report.dataOverviewReportSetup;
        if (!hasWater && this.reportSetup?.includeWaterSection) {
          this.reportSetup.includeWaterSection = false;
          this.save();
        }
      } else {
        this.isFormChange = false;
      }
    });
  }

  async save() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport();
    // selectedReport.dataOverviewReportSetup = this.accountReportsService.updateDataOverviewReportFromForm(selectedReport.dataOverviewReportSetup, this.overviewForm);
    selectedReport.dataOverviewReportSetup = this.reportSetup;
    const activeAccountGuid = this.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountReport', changeKind: 'update', entityGuid: selectedReport.guid, label: 'Save Report',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountReports', upsert: [value] }] }) }},
      () => this.reportHandler.updateAccountReport(selectedReport, activeAccountGuid)
    );
    this.accountWorkspaceService.selectAccountReport(({ ...selectedReport })?.guid);
  }
}
