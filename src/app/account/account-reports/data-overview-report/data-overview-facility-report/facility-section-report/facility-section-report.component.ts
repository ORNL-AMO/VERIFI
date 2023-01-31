import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-facility-section-report',
  templateUrl: './facility-section-report.component.html',
  styleUrls: ['./facility-section-report.component.css']
})
export class FacilitySectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;

  sectionOptions: DataOverviewReportSetup;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
  }
}
