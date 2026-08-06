import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-report-setup-help',
  standalone: false,
  templateUrl: './facility-report-setup-help.component.html',
  styleUrl: './facility-report-setup-help.component.css'
})
export class FacilityReportSetupHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedReport: IdbFacilityReport;
  selectedReportSub: Subscription;

  ngOnInit() {
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport).subscribe(val => {
      this.selectedReport = val;
    });
  }

  ngOnDestroy(){
    this.selectedReportSub.unsubscribe();
  }
}
