import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-section-report',
  templateUrl: './account-section-report.component.html',
  styleUrls: ['./account-section-report.component.css']
})
export class AccountSectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';


  sectionOptions: DataOverviewReportSetup;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
  }

}
