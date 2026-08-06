import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-report-setup-help',
    templateUrl: './report-setup-help.component.html',
    styleUrls: ['./report-setup-help.component.css'],
    standalone: false
})
export class ReportSetupHelpComponent {
  constructor(private injector: Injector) { }

  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  selectedReport: IdbAccountReport;
  selectedReportSub: Subscription;

  ngOnInit() {
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedAccountReport, { injector: this.injector }).subscribe(val => {
      this.selectedReport = val;
    });
  }

  ngOnDestroy(){
    this.selectedReportSub.unsubscribe();
  }
}
