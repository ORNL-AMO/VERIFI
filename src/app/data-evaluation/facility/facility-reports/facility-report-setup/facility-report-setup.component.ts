import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { FacilityReportType, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-report-setup',
  templateUrl: './facility-report-setup.component.html',
  styleUrl: './facility-report-setup.component.css',
  standalone: false
})
export class FacilityReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);

  facilityReportType: FacilityReportType;
  reportName: string;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  constructor(
    private injector: Injector
  ) { }

  ngOnInit() {
    let facilityReport: IdbFacilityReport = this.accountWorkspaceStore.selectedFacilityReport();
    this.facilityReportType = facilityReport.facilityReportType;
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(val => {
      facilityReport = val;
      if (!this.isFormChange)
        this.reportName = facilityReport.name;
      else
        this.isFormChange = false;
    });
  }

  ngOnDestroy() {
    if(this.selectedReportSub) {
      this.selectedReportSub.unsubscribe();
    }
  }


  async saveName() {
    this.isFormChange = true;
    let facilityReport: IdbFacilityReport = this.accountWorkspaceStore.selectedFacilityReport();
    facilityReport.name = this.reportName;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const { value: updatedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'update', entityGuid: facilityReport.guid, label: 'Save Report' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityReports', upsert: [value] }] }) }},
      () => this.reportHandler.updateFacilityReport(facilityReport, activeAccountGuid)
    );
    this.accountWorkspaceService.selectFacilityReport(updatedReport?.guid);
  }
}
