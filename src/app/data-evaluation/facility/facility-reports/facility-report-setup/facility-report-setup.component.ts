import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
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

  facilityReportType: FacilityReportType;
  reportName: string;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  constructor(
    private facilityReportDbService: FacilityReportsDbService

  ) { }

  ngOnInit() {
    let facilityReport: IdbFacilityReport = this.accountWorkspaceStore.selectedFacilityReport();
    this.facilityReportType = facilityReport.facilityReportType;
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport).subscribe(val => {
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
    facilityReport = await firstValueFrom(this.facilityReportDbService.updateWithObservable(facilityReport));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectFacilityReport((facilityReport)?.guid);
  }
}
