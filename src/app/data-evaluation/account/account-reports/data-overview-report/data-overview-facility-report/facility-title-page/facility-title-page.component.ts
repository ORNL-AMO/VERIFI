import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-title-page',
    templateUrl: './facility-title-page.component.html',
    styleUrls: ['./facility-title-page.component.css'],
    standalone: false
})
export class FacilityTitlePageComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  facility: IdbFacility;

  dateRange: { startDate: Date, endDate: Date };
  currentDate: Date = new Date();
  constructor(private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    let report: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport();
    this.dateRange = {
      startDate: new Date(report.startYear, report.startMonth, 1),
      endDate: new Date(report.endYear, report.endMonth, 1)
    };
  }

}
